import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import {
  CHAT_ADMIN_ID,
  ChatContact,
  ChatContactDoc,
  ChatMessage,
  ChatMessageDoc,
} from './chat.model';

function toDate(ts: Timestamp | null | undefined): Date | null {
  return ts ? ts.toDate() : null;
}

function toMessage(id: string, msg: ChatMessageDoc): ChatMessage {
  return {
    id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    // Every write in this app uses `content`; `text` read first only for
    // compatibility with whatever else may have written it (spec §4.4) —
    // do not flip this precedence, it mirrors chat_message.dart exactly.
    content: msg.text ?? msg.content ?? '',
    timestamp: toDate(msg.timestamp) ?? new Date(),
    type: msg.type ?? 'text',
    isRead: msg.isRead ?? false,
  };
}

function toContact(id: string, docData: ChatContactDoc): ChatContact {
  return {
    id,
    otherUserId: docData.otherUserId,
    otherUserName: docData.otherUserName,
    otherUserProfilePic: docData.otherUserProfilePic ?? null,
    lastMessage: docData.lastMessage ?? null,
    lastMessageTime: toDate(docData.lastMessageTime),
    unreadCount: docData.unreadCount ?? 0,
  };
}

/**
 * All Firestore access for Chat — no .NET backend involvement (spec §4).
 * Every read here is a live `.snapshots()`-equivalent stream
 * (`collectionData` with `idField`), matching the Flutter app exactly —
 * there is no one-time `.get()` anywhere in the original chat feature.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly firestore = inject(Firestore);

  /** `conversations/{conversationId}/messages`, ordered `timestamp` desc, unbounded (spec §4.5). */
  getMessages(conversationId: string): Observable<ChatMessage[]> {
    const messagesRef = collection(this.firestore, `conversations/${conversationId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs) => docs.map((d) => toMessage(d['id'] as string, d as ChatMessageDoc))),
    );
  }

  /** `userConversations/admin/contacts`, ordered `lastMessageTime` desc (spec §4.5) — the literal "admin" path, not a variable. */
  getContacts(): Observable<ChatContact[]> {
    const contactsRef = collection(this.firestore, `userConversations/${CHAT_ADMIN_ID}/contacts`);
    const q = query(contactsRef, orderBy('lastMessageTime', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs) => docs.map((d) => toContact(d['id'] as string, d as ChatContactDoc))),
    );
  }

  /**
   * Sends a message and updates both inbox denormalizations in one atomic
   * `writeBatch()` — the Flutter app performs the same 4 writes
   * sequentially with no batching and no rollback on partial failure
   * (spec §4.6); this is a deliberate, documented improvement, not a
   * behavior change to the data shape itself.
   */
  async sendMessage(params: {
    otherUserId: string;
    otherUserName: string;
    otherUserProfilePic?: string | null;
    myName: string;
    content: string;
  }): Promise<void> {
    const { otherUserId, otherUserName, otherUserProfilePic, myName, content } = params;
    const conversationId = otherUserId; // spec §4.3 — conversationId === otherUserId, verbatim
    const now = Timestamp.now(); // client clock, matching the Flutter app exactly (spec §4.7)

    const batch = writeBatch(this.firestore);

    const messageRef = doc(collection(this.firestore, `conversations/${conversationId}/messages`));
    const messageDoc: ChatMessageDoc = {
      senderId: CHAT_ADMIN_ID,
      receiverId: otherUserId,
      content,
      timestamp: now,
      type: 'text',
      isRead: false,
    };
    batch.set(messageRef, messageDoc);

    const conversationRef = doc(this.firestore, `conversations/${conversationId}`);
    batch.set(
      conversationRef,
      {
        lastMessage: content,
        lastMessageTime: now,
        lastMessageSenderId: CHAT_ADMIN_ID,
        members: [CHAT_ADMIN_ID, otherUserId],
      },
      { merge: true },
    );

    const myContactRef = doc(this.firestore, `userConversations/${CHAT_ADMIN_ID}/contacts/${otherUserId}`);
    batch.set(
      myContactRef,
      {
        id: conversationId,
        otherUserId,
        otherUserName,
        otherUserProfilePic: otherUserProfilePic ?? null,
        lastMessage: content,
        lastMessageTime: now,
        unreadCount: 0,
      },
      { merge: true },
    );

    const theirContactRef = doc(this.firestore, `userConversations/${otherUserId}/contacts/${CHAT_ADMIN_ID}`);
    batch.set(
      theirContactRef,
      {
        id: conversationId,
        otherUserId: CHAT_ADMIN_ID,
        otherUserName: myName,
        otherUserProfilePic: null,
        lastMessage: content,
        lastMessageTime: now,
      },
      { merge: true },
    );

    try {
      await batch.commit();
    } catch (err) {
      // Surface the real Firestore error (commonly `permission-denied` on the
      // `theirContactRef` write, which touches the *other* user's own
      // subtree) instead of letting callers guess from a generic rejection.
      console.error('[chat] sendMessage failed', err);
      throw err;
    }
  }
}

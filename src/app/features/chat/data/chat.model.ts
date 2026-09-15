import { Timestamp } from '@angular/fire/firestore';

/**
 * Chat is built entirely on Firestore, with NO .NET backend involvement —
 * verified by a full read of `chat_repo_impl.dart` (spec §4). The
 * conventions below are ported verbatim from that file; do not "improve"
 * the data shape without confirming it wouldn't break the mobile app,
 * which writes to the same collections independently.
 *
 * This dashboard operates as a single fixed identity, `"admin"` — not a
 * per-logged-in-user id — confirmed deliberate in the Flutter source
 * (`chat_screen.dart`: "As per user request, it's only one admin") and
 * kept as-is per product decision (2026-09-15).
 *
 * There is no "browse all residents" directory — a resident/owner only
 * appears here once *they* have messaged the admin at least once, which is
 * the moment their `userConversations/admin/contacts/{id}` doc is created
 * by their own app. The dashboard is reply-only, never cold-starts a
 * conversation (product decision, 2026-09-15).
 */
export const CHAT_ADMIN_ID = 'admin';

export type ChatMessageType = 'text' | 'image' | 'file';

/** `conversations/{conversationId}/messages/{id}` document. */
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: ChatMessageType;
  isRead: boolean;
}

/** `userConversations/admin/contacts/{otherUserId}` document — the admin's own inbox row. */
export interface ChatContact {
  /** Equal to the other party's user id — conversationId === otherUserId, no composite key (spec §4.3). */
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserProfilePic: string | null;
  lastMessage: string | null;
  lastMessageTime: Date | null;
  unreadCount: number;
}

/** Raw Firestore document shapes (Timestamp, not Date) — converted to the interfaces above at the service boundary. */
export interface ChatMessageDoc {
  senderId: string;
  receiverId: string;
  /** Every write in this app uses `content`; `text` is read-only for compatibility with whatever wrote it (spec §4.4). */
  content?: string;
  text?: string;
  timestamp: Timestamp;
  type?: ChatMessageType;
  isRead?: boolean;
}

export interface ChatContactDoc {
  otherUserId: string;
  otherUserName: string;
  otherUserProfilePic?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: Timestamp | null;
  unreadCount?: number;
}


import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { ChatService } from '../../data/chat.service';
import { ChatMessage, CHAT_ADMIN_ID } from '../../data/chat.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * A message shown in the timeline before Firestore's snapshot round-trips —
 * "appears the moment you press send". Purely a rendering concern: nothing
 * is written to Firestore until `sendMessage()` resolves; on failure the
 * pending bubble is removed and the text is restored to the composer.
 */
interface PendingMessage {
  localId: string;
  content: string;
  timestamp: Date;
}

/**
 * Single master-detail chat screen (`/chat` and `/chat/:contactId`) — the
 * contact list and the open conversation live side by side in one shell,
 * never as two separate full-page routes. There is deliberately no "browse
 * all residents" tab: a contact only ever appears once *they* have messaged
 * the admin first (their own app creates `userConversations/admin/contacts/{id}`)
 * — the dashboard replies, it never cold-starts a conversation (product
 * decision, 2026-09-15).
 */
@Component({
  selector: 'app-chat-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, EmptyStateComponent],
  templateUrl: './chat-shell.component.html',
  styleUrl: './chat-shell.component.scss',
})
export class ChatShellComponent {
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly messagesList = viewChild<ElementRef<HTMLDivElement>>('messagesList');

  protected readonly searchTerm = signal('');

  /** `null` while the very first snapshot hasn't arrived yet; `[]` once it's confirmed empty. */
  private readonly contacts = toSignal(this.chat.getContacts(), { initialValue: null });
  protected readonly contactsLoading = computed(() => this.contacts() === null);

  protected readonly filteredContacts = computed(() => {
    const list = this.contacts() ?? [];
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) => c.otherUserName.toLowerCase().includes(term));
  });

  /** Selected contact id — read live from the route so a direct link to `/chat/:contactId` also works. */
  protected readonly contactId = toSignal(
    this.route.paramMap.pipe(switchMap(async (params) => params.get('contactId'))),
    { initialValue: null },
  );

  protected readonly activeContact = computed(() => {
    const id = this.contactId();
    if (!id) return null;
    return (this.contacts() ?? []).find((c) => c.otherUserId === id) ?? null;
  });

  /** Re-subscribes to the messages stream whenever the selected contact changes. */
  private readonly remoteMessages = toSignal(
    toObservable(this.contactId).pipe(
      switchMap((id) => (id ? this.chat.getMessages(id) : [])),
    ),
    { initialValue: null },
  );

  protected readonly messagesLoading = computed(
    () => !!this.contactId() && this.remoteMessages() === null,
  );

  /** Raw optimistic messages, per contact, keyed by contact id so switching conversations never leaks state between them. */
  private readonly pendingByContact = signal<Record<string, PendingMessage[]>>({});
  protected readonly draft = signal('');
  protected readonly isSending = signal(false);

  /**
   * Pending messages for the *currently open* conversation, with anything
   * already confirmed in the real stream filtered out. A pure derivation
   * (not an effect that mutates `pendingByContact`) — the moment Firestore's
   * snapshot includes a message, its optimistic twin simply stops being
   * rendered; there is nothing to "clean up" as a side effect.
   */
  private readonly pending = computed<PendingMessage[]>(() => {
    const id = this.contactId();
    if (!id) return [];
    const remote = this.remoteMessages();
    const list = this.pendingByContact()[id] ?? [];
    if (!remote) return list;
    return list.filter(
      (p) => !remote.some((m) => m.content === p.content && m.senderId === CHAT_ADMIN_ID),
    );
  });

  /** Merges confirmed Firestore messages with locally-pending ones, newest first. */
  protected readonly timeline = computed(() => {
    const remote = this.remoteMessages() ?? [];
    const contactId = this.contactId();
    const pendingAsMessages: ChatMessage[] = this.pending().map((p) => ({
      id: p.localId,
      senderId: CHAT_ADMIN_ID,
      receiverId: contactId ?? '',
      content: p.content,
      timestamp: p.timestamp,
      type: 'text',
      isRead: false,
    }));
    return [...pendingAsMessages, ...remote];
  });

  constructor() {
    // Selecting a different contact clears any leftover composer draft from the previous one.
    // (allowSignalWrites: this effect only ever writes `draft`, never anything it also reads — no re-entrant loop.)
    effect(
      () => {
        this.contactId();
        this.draft.set('');
      },
      { allowSignalWrites: true },
    );

    // Auto-scroll to the newest message (top of a column-reverse list) on any change.
    effect(() => {
      this.timeline();
      queueMicrotask(() => {
        const el = this.messagesList()?.nativeElement;
        if (el) el.scrollTop = 0;
      });
    });
  }

  private addPending(contactId: string, message: PendingMessage): void {
    this.pendingByContact.update((byContact) => ({
      ...byContact,
      [contactId]: [message, ...(byContact[contactId] ?? [])],
    }));
  }

  private removePending(contactId: string, localId: string): void {
    this.pendingByContact.update((byContact) => ({
      ...byContact,
      [contactId]: (byContact[contactId] ?? []).filter((p) => p.localId !== localId),
    }));
  }

  protected openConversation(otherUserId: string): void {
    this.router.navigate(['/chat', otherUserId]);
  }

  protected closeConversation(): void {
    this.router.navigate(['/chat']);
  }

  protected async send(): Promise<void> {
    const content = this.draft().trim();
    const contactId = this.contactId();
    if (!content || !contactId || this.isSending()) return;

    const contact = this.activeContact();
    const myName = this.auth.currentUser()?.userName ?? 'Admin';
    const localId = `pending-${Date.now()}`;

    this.addPending(contactId, { localId, content, timestamp: new Date() });
    this.draft.set('');
    this.isSending.set(true);

    try {
      await this.chat.sendMessage({
        otherUserId: contactId,
        otherUserName: contact?.otherUserName ?? contactId,
        otherUserProfilePic: contact?.otherUserProfilePic ?? null,
        myName,
        content,
      });
    } catch (err) {
      // Roll back: remove the optimistic bubble and give the text back to the composer.
      this.removePending(contactId, localId);
      this.draft.set(content);
      const message =
        err instanceof Error && /permission/i.test(err.message)
          ? 'ليس لديك صلاحية إرسال رسالة لهذا المستخدم'
          : 'تعذّر إرسال الرسالة، حاول مرة أخرى';
      this.toast.error(message);
    } finally {
      this.isSending.set(false);
    }
  }

  protected formatTime(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  protected isMine(message: ChatMessage): boolean {
    return message.senderId === CHAT_ADMIN_ID;
  }

  protected initial(name: string): string {
    return name?.trim()?.charAt(0)?.toUpperCase() || '؟';
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { StorageService } from '../../services/storage.service';
import { HttpCacheService } from '../../services/http-cache.service';
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
  ResetPasswordRequest,
  User,
} from '../models/auth.model';
import { AUTH_ENDPOINTS, LOGIN_ROUTE } from '../auth.config';
import { withInlineHandling, withSkipAuth } from '../../http/http-context.tokens';
import { fetchFcmToken } from '../../firebase/fcm.service';

const USER_KEY = 'rehana_user';

export interface LoginInput {
  email: string;
  password: string;
}

interface LogoutOptions {
  redirect?: boolean;
  reason?: string;
}

type CrossTabMessage = { type: 'logged-out'; from: string };

/**
 * Session management for a backend with a single opaque bearer token — no
 * refresh token, no JWT `exp` claim, no refresh endpoint exists (verified:
 * `endpoint.dart` has no refresh route, spec §2/§10 issue 1-2). A token is
 * either present and accepted by the API, or it isn't; a 401 means "sign in
 * again," full stop. Do not reintroduce refresh/proactive-renewal machinery
 * without a confirmed backend contract for it.
 *
 * This intentionally CLOSES the Flutter app's session-check gap (spec §10
 * issue 1: `token != null || role != null`, an OR that lets a stale role
 * string alone grant access) — `isLoggedIn()` here requires a real token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly httpCache = inject(HttpCacheService);

  private readonly currentUserSignal = signal<User | null>(this.loadStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.getAccessToken());

  private channel: BroadcastChannel | null = null;
  private readonly tabId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  constructor() {
    this.initCrossTabSync();
  }

  /**
   * `loginOwner` returns JSON on success but a PLAIN-TEXT body on failure
   * (e.g. "Invalid email or password") — confirmed against the live
   * backend, matching spec §2's three-response-shape finding. Requesting
   * with the default `responseType: 'json'` makes Angular's HttpClient try
   * `JSON.parse()` on that plain-text error body and throw a SyntaxError
   * that swallows the real backend message, so this reads the response as
   * text unconditionally and parses JSON manually only on success.
   */
  login(input: LoginInput): Observable<User> {
    return fetchFcmToken().pipe(
      catchError(() => of('')),
      map((deviceToken): LoginRequest => ({
        email: input.email.trim(),
        password: input.password,
        rememberMe: true,
        deviceToken: deviceToken ?? '',
      })),
      switchMap((payload) =>
        this.api.post<string>(AUTH_ENDPOINTS.login, payload, {
          context: withInlineHandling(withSkipAuth()),
          responseType: 'text',
        }),
      ),
      map((raw) => {
        const data = this.parseLoginResponse(raw);
        if (!data?.token) throw new Error('Missing token in response');
        return this.persistSession(data);
      }),
    );
  }

  private parseLoginResponse(raw: string): LoginResponseData {
    try {
      return JSON.parse(raw) as LoginResponseData;
    } catch {
      // A plain-text success body would be unusual but not impossible for
      // this backend — surface it as the error message rather than a
      // generic "missing token" so the user sees what the server actually said.
      throw new Error(raw || 'Missing token in response');
    }
  }

  forgotPassword(email: string): Observable<unknown> {
    const payload: ForgotPasswordRequest = { email: email.trim() };
    return this.api.post<unknown>(AUTH_ENDPOINTS.forgotPassword, payload, {
      context: withInlineHandling(withSkipAuth()),
      responseType: 'text',
    });
  }

  resetPassword(input: ResetPasswordRequest): Observable<unknown> {
    return this.api.post<unknown>(AUTH_ENDPOINTS.resetPassword, input, {
      context: withInlineHandling(withSkipAuth()),
      responseType: 'text',
    });
  }

  logout(opts: LogoutOptions = {}): void {
    const { redirect = true, reason } = opts;
    this.clearLocalSession();
    this.broadcast({ type: 'logged-out', from: this.tabId });
    if (reason) console.warn(reason);
    if (redirect) this.navigateToLogin();
  }

  getAccessToken(): string | null {
    return this.storage.get(environment.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  hasRole(role: UserRoleLike): boolean {
    return !!this.currentUserSignal()?.roles.includes(role);
  }

  // ────────────────────── persistence ──────────────────────

  private persistSession(data: LoginResponseData): User {
    this.storage.set(environment.tokenKey, data.token);
    this.storage.set(environment.nameKey, data.userName ?? data.fullName ?? '');
    this.storage.set(environment.roleKey, data.roles?.[0] ?? 'user');

    const user: User = {
      email: data.email,
      userName: data.userName,
      fullName: data.fullName ?? null,
      phoneNumber: data.phoneNumber ?? null,
      roles: data.roles ?? [],
    };
    this.storage.setJson(USER_KEY, user);
    this.currentUserSignal.set(user);
    return user;
  }

  private clearLocalSession(): void {
    this.storage.remove(environment.tokenKey);
    this.storage.remove(environment.nameKey);
    this.storage.remove(environment.roleKey);
    this.storage.remove(USER_KEY);
    this.currentUserSignal.set(null);
    this.httpCache.clear();
  }

  private loadStoredUser(): User | null {
    if (!this.getAccessToken()) return null;
    return this.storage.getJson<User>(USER_KEY);
  }

  private navigateToLogin(): void {
    const url = this.router.url ?? '';
    if (url.startsWith(LOGIN_ROUTE)) return;
    this.router.navigateByUrl(LOGIN_ROUTE).catch(() => {
      /* a concurrent navigation is already resolving — it will land the
       * user on the login page, so swallowing here is correct. */
    });
  }

  // ────────────────────── multi-tab sync ──────────────────────

  private initCrossTabSync(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.channel = new BroadcastChannel('rehana-auth');
      this.channel.onmessage = (e) => this.onCrossTabMessage(e.data as CrossTabMessage);
    } catch {
      this.channel = null;
    }
  }

  private onCrossTabMessage(msg: CrossTabMessage): void {
    if (!msg || msg.from === this.tabId || msg.type !== 'logged-out') return;
    this.clearLocalSession();
    this.navigateToLogin();
  }

  private broadcast(msg: CrossTabMessage): void {
    try {
      this.channel?.postMessage(msg);
    } catch {
      /* channel closed — ignore */
    }
  }
}

type UserRoleLike = string;

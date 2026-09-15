import { Observable, of } from 'rxjs';

/**
 * Placeholder — real FCM wiring (via `@angular/fire`) lands with the Chat
 * feature (spec §4), which is what actually initializes Firebase in this
 * app. Until then this returns `''`, matching the Flutter app's own
 * fallback when `FirebaseMessaging.isSupported()` is false (spec §4: it
 * continues without push notifications rather than failing login).
 */
export function fetchFcmToken(): Observable<string> {
  return of('');
}

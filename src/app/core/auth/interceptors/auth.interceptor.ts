import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SKIP_AUTH } from '../../http/http-context.tokens';
import { environment } from '../../../../environments/environment';

/**
 * Attaches `Authorization: Bearer <token>` and `Accept-Language: ar` to
 * every request unless the caller opts out via `SKIP_AUTH`.
 *
 * There is no refresh token on this backend (verified: no refresh route in
 * `endpoint.dart`, spec §2/§10 issue 2) — a 401 means the session is dead,
 * full stop. This is a real, deliberate improvement over the Flutter app,
 * which has no 401 handling at all (`handleDioExceptions` only logs and
 * rethrows).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) return next(withAcceptLanguage(req));

  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const authReq = token ? withAuthHeader(withAcceptLanguage(req), token) : withAcceptLanguage(req);

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout({ reason: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى' });
      }
      return throwError(() => err);
    }),
  );
};

function withAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function withAcceptLanguage(req: HttpRequest<unknown>): HttpRequest<unknown> {
  return req.clone({ setHeaders: { 'Accept-Language': environment.acceptLanguage } });
}

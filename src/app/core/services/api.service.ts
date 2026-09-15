import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedQuery, PagedResponse } from '../models/api-response.model';
import { toList, toPaged } from '../utils/api-list.util';

export interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: HttpHeaders | Record<string, string>;
  context?: HttpContext;
  /**
   * Rehana's backend returns three distinct body shapes with no schema to
   * tell them apart (spec §2): a JSON object, a bare JSON array, or plain
   * text (six confirmed endpoints compare the body against a literal
   * English string). Callers must say which one they expect — the
   * generic starter's assume-JSON-always behavior would throw on the
   * plain-text endpoints.
   */
  responseType?: 'json' | 'text';
}

/**
 * Thin, typed wrapper around `HttpClient` for Rehana's REST API.
 *
 * Unlike the original starter, there is no `{data: ...}` envelope to
 * unwrap — every endpoint's shape is exactly what the backend sends
 * (object, bare array, or plain text). `getPaged`/`getList` give callers a
 * typed way to say which list shape they expect instead of guessing at
 * runtime with scattered `response is List` checks, the way the Flutter
 * app does per-repo (spec §3.8).
 *
 * Each verb branches explicitly on `responseType` rather than forwarding a
 * dynamically-typed options object straight to `HttpClient` — its overloads
 * are keyed on a literal `'json' | 'text'` at the call site, so a runtime
 * value can't select between them.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = this.normalizeBase(environment.apiUrl);

  get<T>(endpoint: string, options: RequestOptions = {}): Observable<T> {
    const url = this.url(endpoint);
    if (options.responseType === 'text') {
      return this.http.get(url, { ...this.commonOpts(options), responseType: 'text' }) as Observable<T>;
    }
    return this.http.get<T>(url, { ...this.commonOpts(options), responseType: 'json' });
  }

  /** For endpoints returning `{items, page, pageSize, totalItems, totalPages}` (spec §3.5/§3.6/§3.8). */
  getPaged<T>(
    endpoint: string,
    query: PagedQuery = {},
    options: RequestOptions = {},
  ): Observable<PagedResponse<T>> {
    return this.get<unknown>(endpoint, { ...options, params: { ...options.params, ...query } }).pipe(
      toPaged<T>(),
    );
  }

  /** For endpoints returning a bare JSON array with no envelope (e.g. `/Dashboard/list`). */
  getList<T>(endpoint: string, options: RequestOptions = {}): Observable<T[]> {
    return this.get<unknown>(endpoint, options).pipe(toList<T>());
  }

  post<T>(endpoint: string, body: unknown, options: RequestOptions = {}): Observable<T> {
    const url = this.url(endpoint);
    if (options.responseType === 'text') {
      return this.http.post(url, body, { ...this.commonOpts(options), responseType: 'text' }) as Observable<T>;
    }
    return this.http.post<T>(url, body, { ...this.commonOpts(options), responseType: 'json' });
  }

  put<T>(endpoint: string, body: unknown, options: RequestOptions = {}): Observable<T> {
    const url = this.url(endpoint);
    if (options.responseType === 'text') {
      return this.http.put(url, body, { ...this.commonOpts(options), responseType: 'text' }) as Observable<T>;
    }
    return this.http.put<T>(url, body, { ...this.commonOpts(options), responseType: 'json' });
  }

  patch<T>(endpoint: string, body: unknown, options: RequestOptions = {}): Observable<T> {
    const url = this.url(endpoint);
    if (options.responseType === 'text') {
      return this.http.patch(url, body, { ...this.commonOpts(options), responseType: 'text' }) as Observable<T>;
    }
    return this.http.patch<T>(url, body, { ...this.commonOpts(options), responseType: 'json' });
  }

  delete<T>(endpoint: string, options: RequestOptions = {}): Observable<T> {
    const url = this.url(endpoint);
    if (options.responseType === 'text') {
      return this.http.delete(url, { ...this.commonOpts(options), responseType: 'text' }) as Observable<T>;
    }
    return this.http.delete<T>(url, { ...this.commonOpts(options), responseType: 'json' });
  }

  // ─────────── internals ───────────

  private url(endpoint: string): string {
    return `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
  }

  private commonOpts(options: RequestOptions): {
    params?: HttpParams;
    headers?: HttpHeaders | Record<string, string>;
    context?: HttpContext;
  } {
    return {
      params: options.params ? this.toParams(options.params) : undefined,
      headers: options.headers,
      context: options.context,
    };
  }

  private toParams(input: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(input)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value)) {
        for (const v of value) params = params.append(key, String(v));
      } else {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private normalizeBase(raw: string): string {
    return raw.replace(/\/+$/, '');
  }
}

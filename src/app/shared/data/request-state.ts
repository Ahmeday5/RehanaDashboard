/**
 * Single state shape for every feature — replaces the Flutter app's 13
 * hand-rolled Cubit+State pairs (96 bespoke classes combined, spec §1.3/§8)
 * with one generic pattern, generalizing the one place the Flutter app
 * already got this right (Chat's `BaseState<T>`).
 *
 * Every feature gets exactly one signal-based service exposing
 * `signal<RequestState<T>>(...)` plus `load()/create()/update()/delete()`
 * methods against the shared `ApiService` — no per-feature state classes.
 */
export type RequestStatus = 'idle' | 'loading' | 'loadingMore' | 'success' | 'error';

export interface RequestState<T> {
  status: RequestStatus;
  data: T | null;
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  errorMessage: string | null;
}

export function initialRequestState<T>(): RequestState<T> {
  return {
    status: 'idle',
    data: null,
    items: [],
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalItems: 0,
    errorMessage: null,
  };
}

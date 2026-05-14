// ─── Shared result type ───────────────────────────────────────────────────────

/**
 * All service functions return ApiResult<T>.
 * Callers destructure { data, error } — never throw/catch at the call site.
 *
 * On success:  { data: T,    error: null }
 * On failure:  { data: null, error: ApiError }
 */
export type ApiResult<T> =
  | { data: T;    error: null     }
  | { data: null; error: ApiError };

export interface ApiError {
  message: string;
  code?:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap any Supabase { data, error } pair into an ApiResult */
export function ok<T>(data: T): ApiResult<T> {
  return { data, error: null };
}

export function fail(err: unknown): ApiResult<never> {
  const message =
    err instanceof Error            ? err.message       :
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as any).message) :
    'An unexpected error occurred.';

  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as any).code)
      : undefined;

  return { data: null, error: { message, code } };
}

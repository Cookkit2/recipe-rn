import type { AuthResult, User, AuthSession } from "~/types/AuthTypes";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { authRateLimiter } from "~/utils/rate-limiter";
import { log } from "~/utils/logger";

/**
 * Shared helpers for Supabase auth flow patterns.
 * Eliminates repeated auth operation boilerplate across SupabaseAuthStrategy methods.
 */

/**
 * Create the standard "Supabase not configured" error result.
 */
export function supabaseUnavailableResult(): AuthResult {
  return {
    success: false,
    error: {
      code: "SUPABASE_UNAVAILABLE",
      message: "Supabase is not configured",
      retryable: false,
    },
  };
}

/**
 * Standard Supabase auth operation wrapper.
 * Handles the common pattern: guard check → Supabase call → error mapping → success mapping.
 *
 * @param supabase - The supabase client (falsy means unavailable)
 * @param operation - Label for error messages (e.g. "sign in")
 * @param errorCode - Error code prefix (e.g. "SIGNIN")
 * @param supabaseCall - Function that calls Supabase and returns { data, error } or throws
 * @param onSuccess - Called when data contains user + session; returns the AuthResult
 * @param noDataErrorCode - Error code when no data is returned
 * @param noDataMessage - Message when no data is returned
 */
export async function executeAuthOperation<
  TData extends { user?: SupabaseUser | null; session?: Session | null },
>(
  supabase: unknown,
  operation: string,
  errorCode: string,
  supabaseCall: () => Promise<{ data: TData; error: any }>,
  onSuccess: (user: SupabaseUser, session: Session, data: TData) => AuthResult,
  noDataErrorCode: string,
  noDataMessage: string,
  handleSupabaseError: (error: any) => AuthResult
): Promise<AuthResult> {
  if (!supabase) {
    return supabaseUnavailableResult();
  }

  try {
    const { data, error } = await supabaseCall();

    if (error) {
      return handleSupabaseError(error);
    }

    if (data.user && data.session) {
      return onSuccess(data.user, data.session, data);
    }

    return {
      success: false,
      error: {
        code: noDataErrorCode,
        message: noDataMessage,
        retryable: true,
      },
    };
  } catch (error) {
    log.error(`Error in ${operation}:`, error);
    return {
      success: false,
      error: {
        code: `${errorCode}_ERROR`,
        message: `An unexpected error occurred during ${operation}`,
        retryable: true,
        originalError: error,
      },
    };
  }
}

/**
 * Check rate limiting for an identifier.
 * Returns an error result if rate limited, or null if allowed.
 */
export function checkRateLimit(identifier: string, operationLabel: string): AuthResult | null {
  if (!authRateLimiter.canAttempt(identifier)) {
    return {
      success: false,
      error: {
        code: "TOO_MANY_ATTEMPTS",
        message: `Too many ${operationLabel} attempts. Please try again later.`,
        retryable: false,
      },
    };
  }
  return null;
}

/**
 * Normalize an email for rate limiting purposes.
 */
export function normalizeRateLimitId(
  email: string | undefined,
  fallback: string = "anonymous"
): string {
  return email?.toLowerCase().trim() || fallback;
}

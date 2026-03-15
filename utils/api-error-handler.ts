/**
 * API Error Handler Utilities
 *
 * Provides standardized error handling wrapper functions for API operations.
 * These utilities eliminate repetitive try-catch blocks and ensure consistent
 * error logging and error handling patterns across all API files.
 *
 * The four main wrapper functions are:
 * - `withErrorHandling`: Logs error and returns a default value (most common)
 * - `withErrorLogging`: Logs error and re-throws (for critical operations)
 * - `withStructuredError`: Returns { success, error } object (for import APIs)
 * - `withSilentError`: Returns default value without logging (for non-critical operations)
 *
 * @example
 * ```ts
 * // Instead of:
 * async fetchAllPantryItems(): Promise<PantryItem[]> {
 *   try {
 *     const items = await databaseFacade.getAllStock();
 *     return items;
 *   } catch (error) {
 *     log.error("Error fetching pantry items:", error);
 *     return [];
 *   }
 * }
 *
 * // Use:
 * async fetchAllPantryItems(): Promise<PantryItem[]> {
 *   return withErrorHandling(
 *     async () => {
 *       const items = await databaseFacade.getAllStock();
 *       return items;
 *     },
 *     "Error fetching pantry items"
 *   );
 * }
 * ```
 */

import { log } from "./logger";
import { err, ok, type AppResult } from "./result";
import { unknownError, type AppError } from "~/types/AppError";

/**
 * Configuration options for error handling
 *
 * @example
 * ```ts
 * const options: ErrorHandlerOptions = {
 *   logLevel: "warn",
 *   logError: true
 * };
 * ```
 */
export interface ErrorHandlerOptions {
  /** Custom log level (default: 'error') */
  logLevel?: "error" | "warn" | "info" | "debug";
  /** Whether to include the error in logs (default: true) */
  logError?: boolean;
}

/**
 * Success result type for structured error handling
 * Used by APIs that return success/error status instead of throwing
 *
 * @example
 * ```ts
 * const result: StructuredErrorResult<Recipe> = {
 *   success: true,
 *   data: myRecipe
 * };
 * ```
 */
export interface StructuredErrorResult<T> {
  /** Indicates the operation succeeded */
  success: true;
  /** The returned data from the successful operation */
  data: T;
  /** Error is never present on success */
  error?: never;
}

/**
 * Failure result type for structured error handling
 *
 * @example
 * ```ts
 * const result: StructuredErrorFailure = {
 *   success: false,
 *   error: "Failed to parse recipe"
 * };
 * ```
 */
export interface StructuredErrorFailure {
  /** Indicates the operation failed */
  success: false;
  /** Data is never present on failure */
  data?: never;
  /** Error message describing the failure */
  error: string;
}

/**
 * Union type for structured error handling results
 * Use type guards to check success before accessing data
 *
 * @example
 * ```ts
 * const result = await importRecipe(url);
 * if (result.success) {
 *   // TypeScript knows result.data exists here
 *   console.log(result.data.title);
 * } else {
 *   // TypeScript knows result.error exists here
 *   console.error(result.error);
 * }
 * ```
 */
export type StructuredResult<T> = StructuredErrorResult<T> | StructuredErrorFailure;

/**
 * Wraps an async function with error handling that logs and returns a default value.
 * This is the most common pattern - used for fetch operations that should gracefully fail.
 *
 * @param fn - The async function to wrap
 * @param errorMessage - Message to log on error
 * @param defaultValue - The default value to return on error
 * @returns The result of the function or the default value on error
 *
 * @example
 * ```ts
 * async fetchAllPantryItems(): Promise<PantryItem[]> {
 *   return withErrorHandling(
 *     async () => {
 *       const items = await databaseFacade.getAllStock();
 *       return convertToPantryItems(items);
 *     },
 *     "Error fetching pantry items",
 *     []
 *   );
 * }
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Log error for debugging but return default value to keep app functional
    log.error(`${errorMessage}:`, error);
    return defaultValue;
  }
}

/**
 * Wraps an async function with error handling that logs and re-throws.
 * Used for critical operations where the caller needs to handle the error.
 *
 * @param fn - The async function to wrap
 * @param errorMessage - Message to log on error
 * @returns The result of the function
 * @throws The original error after logging it
 *
 * @example
 * ```ts
 * async addPantryItem(item: PantryItem): Promise<PantryItem> {
 *   return withErrorLogging(
 *     async () => {
 *       const stockItem = await databaseFacade.createStock(item);
 *       return convertToPantryItem(stockItem);
 *     },
 *     "Error adding pantry item"
 *   );
 * }
 * ```
 */
export async function withErrorLogging<T>(fn: () => Promise<T>, errorMessage: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Log error before re-throwing so caller can handle it
    log.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Wraps an async function with structured error handling.
 * Returns { success: true, data } on success or { success: false, error } on failure.
 * Used for import APIs and operations where the caller checks success status.
 *
 * @param fn - The async function to wrap
 * @param errorMessagePrefix - Prefix for error message on failure
 * @returns Structured result with success status
 *
 * @example
 * ```ts
 * async importRecipeFromUrl(url: string): Promise<StructuredResult<Recipe>> {
 *   return withStructuredError(
 *     async () => {
 *       const recipe = await fetchAndParseRecipe(url);
 *       return recipe;
 *     },
 *     "Recipe Import"
 *   );
 * }
 *
 * // Usage:
 * const result = await importRecipeFromUrl(url);
 * if (result.success) {
 *   console.log(result.data.title);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function withStructuredError<T>(
  fn: () => Promise<T>,
  errorMessagePrefix: string
): Promise<StructuredResult<T>> {
  try {
    const data = await fn();
    // Return success result with data
    return { success: true, data };
  } catch (error) {
    // Extract error message or use default
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    log.error(`${errorMessagePrefix}: Error -`, errorMessage);
    // Return failure result with error message (never throws)
    return { success: false, error: errorMessage };
  }
}

/**
 * Wraps an async function with silent error handling.
 * Returns a default value on error WITHOUT logging.
 * Used for non-critical operations where errors are expected or not worth logging.
 *
 * @param fn - The async function to wrap
 * @param defaultValue - The default value to return on error
 * @returns The result of the function or the default value on error
 *
 * @example
 * ```ts
 * async getAvailableRecipes(): Promise<{ canMake: Recipe[] }> {
 *   return withSilentError(
 *     async () => {
 *       const availability = await databaseFacade.getAvailableRecipes();
 *       return { canMake: availability.canMake };
 *     },
 *     { canMake: [] }
 *   );
 * }
 * ```
 */
export async function withSilentError<T>(fn: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await fn();
  } catch {
    // Return default value silently - no logging for non-critical operations
    return defaultValue;
  }
}

/**
 * Wraps an async function with warning-level error handling.
 * Logs a warning instead of an error and returns a default value.
 * Used for operations where failure is not exceptional but should be noted.
 *
 * @param fn - The async function to wrap
 * @param warningMessage - Message to log on error
 * @param defaultValue - The default value to return on error
 * @returns The result of the function or the default value on error
 *
 * @example
 * ```ts
 * async validateCookingVideo(url: string): Promise<ValidationResult> {
 *   return withWarningHandling(
 *     async () => {
 *       const info = await youtubeService.getVideoInfo(videoId);
 *       return { isValid: true, isCooking: checkCooking(info.title) };
 *     },
 *     "Could not validate video",
 *     { isValid: false, isCooking: false, confidence: 0 }
 *   );
 * }
 * ```
 */
export async function withWarningHandling<T>(
  fn: () => Promise<T>,
  warningMessage: string,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Log as warning instead of error - failure is not exceptional
    log.warn(`${warningMessage}:`, error);
    return defaultValue;
  }
}

/**
 * Helper for processing arrays with error handling.
 * Processes items sequentially, continuing even if individual items fail.
 * Errors are logged but don't stop processing of other items.
 *
 * @param items - Array of items to process
 * @param processorFn - Async function to process each item
 * @param errorMessagePrefix - Prefix for error messages
 * @returns Array of successfully processed results (filters out failures)
 *
 * @example
 * ```ts
 * async addPantryItems(items: NewPantryItem[]): Promise<PantryItem[]> {
 *   return withArrayErrorHandling(
 *     items,
 *     async (item) => {
 *       const stock = await databaseFacade.createStock(item);
 *       return convertToPantryItem(stock);
 *     },
 *     "Failed to add pantry item"
 *   );
 * }
 * ```
 */
export async function withArrayErrorHandling<TInput, TOutput>(
  items: TInput[],
  processorFn: (item: TInput) => Promise<TOutput>,
  errorMessagePrefix: string
): Promise<TOutput[]> {
  const results: TOutput[] = [];

  // Process each item sequentially, continuing even if individual items fail
  for (const item of items) {
    try {
      const result = await processorFn(item);
      results.push(result);
    } catch (error) {
      // Log the error for this item but continue processing others
      log.error(`${errorMessagePrefix}:`, item, error);
      // Continue with other items instead of failing completely
    }
  }

  // Return only successfully processed items
  return results;
}

/**
 * Higher-order function that creates a typed error handler for a specific API.
 * Useful for creating domain-specific error handlers with consistent behavior.
 *
 * @param defaultConfig - Default error handling configuration
 * @returns An object with pre-configured error handling methods
 *
 * @example
 * ```ts
 * const pantryErrorHandler = createErrorHandler({
 *   logLevel: "error",
 *   context: "PantryAPI",
 * });
 *
 * // Usage
 * async fetchAllPantryItems(): Promise<PantryItem[]> {
 *   return pantryErrorHandler.withErrorHandling(
 *     async () => databaseFacade.getAllStock(),
 *     "fetching pantry items",
 *     []
 *   );
 * }
 * ```
 */
export function createErrorHandler(defaultConfig: { context?: string }) {
  // Build context prefix for log messages if context is provided
  const contextPrefix = defaultConfig.context ? `${defaultConfig.context}: ` : "";

  // Return an object with pre-configured error handling methods
  return {
    withErrorHandling: <T>(
      fn: () => Promise<T>,
      errorMessage: string,
      defaultValue: T
    ): Promise<T> => withErrorHandling(fn, `${contextPrefix}${errorMessage}`, defaultValue),

    withErrorLogging: <T>(fn: () => Promise<T>, errorMessage: string): Promise<T> =>
      withErrorLogging(fn, `${contextPrefix}${errorMessage}`),

    withStructuredError: <T>(
      fn: () => Promise<T>,
      errorMessagePrefix: string
    ): Promise<StructuredResult<T>> =>
      withStructuredError(fn, `${contextPrefix}${errorMessagePrefix}`),

    withSilentError: <T>(fn: () => Promise<T>, defaultValue: T): Promise<T> =>
      withSilentError(fn, defaultValue),

    withWarningHandling: <T>(
      fn: () => Promise<T>,
      warningMessage: string,
      defaultValue: T
    ): Promise<T> => withWarningHandling(fn, `${contextPrefix}${warningMessage}`, defaultValue),
  };
}

function isAppError(e: unknown): e is AppError {
  if (typeof e !== "object" || e === null) return false;
  const o = e as { kind?: unknown; message?: unknown };
  if (typeof o.kind !== "string" || typeof o.message !== "string") return false;
  switch (o.kind) {
    case "infra":
    case "validation":
    case "not_found":
    case "conflict":
    case "unknown":
      return true;
    default: {
      // @ts-expect-error
      const _: never = o;
      return false;
    }
  }
}

function defaultErrorMapper(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (e instanceof Error) return unknownError(e.message, e);
  return unknownError("Unknown error", e);
}

function mapToAppError(e: unknown, errorMapper?: (e: unknown) => AppError): AppError {
  if (!errorMapper) return defaultErrorMapper(e);
  try {
    return errorMapper(e);
  } catch {
    return defaultErrorMapper(e);
  }
}

/**
 * Wraps an async function and returns a Result. Uses try/catch once;
 * converts thrown errors to AppError via errorMapper or default classification.
 */
export async function wrapResult<T>(
  fn: () => Promise<T>,
  errorMapper?: (e: unknown) => AppError
): Promise<AppResult<T, AppError>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e) {
    return err(mapToAppError(e, errorMapper));
  }
}

/**
 * Like wrapResult but also logs the error (full error object for stack traces)
 * and returns the Result.
 */
export async function logAndWrapResult<T>(
  fn: () => Promise<T>,
  errorMessagePrefix: string,
  errorMapper?: (e: unknown) => AppError
): Promise<AppResult<T, AppError>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e) {
    log.error(`${errorMessagePrefix}:`, e);
    let appError = mapToAppError(e, errorMapper);
    if (appError.kind === "unknown" && !appError.message.startsWith(`${errorMessagePrefix}:`)) {
      appError = unknownError(`${errorMessagePrefix}: ${appError.message}`, appError.cause);
    }
    return err(appError);
  }
}

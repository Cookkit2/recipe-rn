/**
 * Domain error taxonomy for the app.
 * Discriminated union used with neverthrow Result types.
 */

export type InfraError = {
  kind: "infra";
  message: string;
  cause?: unknown;
};

export type ValidationError = {
  kind: "validation";
  message: string;
  cause?: unknown;
};

export type NotFoundError = {
  kind: "not_found";
  message: string;
  cause?: unknown;
};

export type ConflictError = {
  kind: "conflict";
  message: string;
  cause?: unknown;
};

export type UnknownError = {
  kind: "unknown";
  message: string;
  cause?: unknown;
};

export type AppError = InfraError | ValidationError | NotFoundError | ConflictError | UnknownError;

export function infraError(message: string, cause?: unknown): InfraError {
  return { kind: "infra", message, cause };
}

export function validationError(message: string, cause?: unknown): ValidationError {
  return { kind: "validation", message, cause };
}

export function notFoundError(message: string, cause?: unknown): NotFoundError {
  return { kind: "not_found", message, cause };
}

export function conflictError(message: string, cause?: unknown): ConflictError {
  return { kind: "conflict", message, cause };
}

export function unknownError(message: string, cause?: unknown): UnknownError {
  return { kind: "unknown", message, cause };
}

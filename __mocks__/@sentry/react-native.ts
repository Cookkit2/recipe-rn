export const logger = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  fatal: () => undefined,
};

export function captureException(): void {}
export function captureMessage(): void {}
export function addBreadcrumb(): void {}

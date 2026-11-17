export class RepositoryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown };
  return typeof value.code === "string" ? value.code : undefined;
}

export function isPostgresErrorCode(error: unknown, code: string): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth += 1) {
    if (seen.has(current)) return false;
    seen.add(current);
    if (errorCode(current) === code) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export function isUniqueViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23505");
}

export function isCheckViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23514");
}

export function isForeignKeyViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, "23503");
}

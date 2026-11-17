import { RepositoryError } from "../db/errors";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getTrustedOrigins(): string[] {
  const values = [
    process.env.BETTER_AUTH_URL,
    process.env.APP_ORIGIN,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return [...new Set(values.filter((value): value is string => Boolean(value)).map(normalizeOrigin))];
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    throw new RepositoryError("ORIGIN_REQUIRED", "A same-origin Origin header is required for this request.", 403);
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new RepositoryError("ORIGIN_INVALID", "The Origin header is not a valid URL.", 403);
  }

  const requestUrl = new URL(request.url);
  if (parsedOrigin.host === requestUrl.host) return;
  if (getTrustedOrigins().includes(normalizeOrigin(parsedOrigin.origin))) return;

  throw new RepositoryError("ORIGIN_FORBIDDEN", "Cross-origin requests are not allowed.", 403);
}

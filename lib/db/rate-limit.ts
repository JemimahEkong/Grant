import { sql } from "drizzle-orm";
import type { GrantDatabase } from "./client";
import { RepositoryError } from "./errors";
import { rateLimits } from "./schema";

export type RateLimitAction = "quote" | "approve" | "pay" | "reconcile" | "delivery" | "share" | "wallet" | "faucet";

const defaults: Record<RateLimitAction, { limit: number; windowSeconds: number }> = {
  quote: { limit: 20, windowSeconds: 60 },
  approve: { limit: 20, windowSeconds: 60 },
  pay: { limit: 5, windowSeconds: 60 },
  reconcile: { limit: 10, windowSeconds: 60 },
  delivery: { limit: 10, windowSeconds: 60 },
  share: { limit: 10, windowSeconds: 60 },
  wallet: { limit: 20, windowSeconds: 60 },
  faucet: { limit: 3, windowSeconds: 60 },
};

export async function consumeRateLimit(
  db: GrantDatabase,
  input: {
    ownerId: string;
    action: RateLimitAction;
    now?: Date;
    limit?: number;
    windowSeconds?: number;
  },
): Promise<{ remaining: number; resetAt: Date }> {
  const config = defaults[input.action];
  const limit = input.limit ?? config.limit;
  const windowSeconds = input.windowSeconds ?? config.windowSeconds;
  const now = input.now ?? new Date();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({
      ownerId: input.ownerId,
      action: input.action,
      windowStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimits.ownerId, rateLimits.action, rateLimits.windowStart],
      set: {
        count: sql`${rateLimits.count} + 1`,
        updatedAt: now,
      },
    })
    .returning({ count: rateLimits.count });

  const count = row?.count ?? 1;
  const resetAt = new Date(windowStart.getTime() + windowMs);
  if (count > limit) {
    throw new RepositoryError(
      "RATE_LIMITED",
      "Too many requests. Retry after the current window.",
      429,
      {
        action: input.action,
        limit,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
      },
    );
  }
  return { remaining: Math.max(0, limit - count), resetAt };
}

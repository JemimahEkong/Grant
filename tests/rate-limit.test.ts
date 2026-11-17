import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { consumeRateLimit } from "../lib/db/rate-limit";
import { rateLimits } from "../lib/db/schema";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;
const ownerA = `rate-owner-a-${randomUUID()}`;
const ownerB = `rate-owner-b-${randomUUID()}`;
const windowStart = new Date("2026-01-01T00:00:00Z");

let client: ReturnType<typeof createDatabase>;
let db: GrantDatabase;

dbDescribe("database rate limits", () => {
  beforeAll(() => {
    if (!testDatabaseUrl) return;
    client = createDatabase(testDatabaseUrl);
    db = client.db;
  }, 30_000);

  afterAll(async () => {
    if (!testDatabaseUrl) return;
    await db.delete(rateLimits).where(inArray(rateLimits.ownerId, [ownerA, ownerB]));
    await client.close();
  }, 30_000);

  it("counts per owner and action within one fixed window", async () => {
    const first = await consumeRateLimit(db, {
      ownerId: ownerA,
      action: "pay",
      limit: 2,
      windowSeconds: 60,
      now: windowStart,
    });
    expect(first.remaining).toBe(1);

    const second = await consumeRateLimit(db, {
      ownerId: ownerA,
      action: "pay",
      limit: 2,
      windowSeconds: 60,
      now: windowStart,
    });
    expect(second.remaining).toBe(0);

    await expect(
      consumeRateLimit(db, {
        ownerId: ownerA,
        action: "pay",
        limit: 2,
        windowSeconds: 60,
        now: windowStart,
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });

    const otherOwner = await consumeRateLimit(db, {
      ownerId: ownerB,
      action: "pay",
      limit: 2,
      windowSeconds: 60,
      now: windowStart,
    });
    expect(otherOwner.remaining).toBe(1);

    const otherAction = await consumeRateLimit(db, {
      ownerId: ownerA,
      action: "quote",
      limit: 2,
      windowSeconds: 60,
      now: windowStart,
    });
    expect(otherAction.remaining).toBe(1);
  });

  it("serializes concurrent increments without exceeding the limit", async () => {
    const concurrentOwner = `rate-owner-c-${randomUUID()}`;
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          consumeRateLimit(db, {
            ownerId: concurrentOwner,
            action: "reconcile",
            limit: 3,
            windowSeconds: 60,
            now: windowStart,
          }),
        ),
      );
      const fulfilled = results.filter(result => result.status === "fulfilled");
      const rejected = results.filter(result => result.status === "rejected");
      expect(fulfilled).toHaveLength(3);
      expect(rejected).toHaveLength(2);

      const rows = await db.select().from(rateLimits).where(eq(rateLimits.ownerId, concurrentOwner));
      expect(rows).toHaveLength(1);
      expect(rows[0].count).toBe(5);
    } finally {
      await db.delete(rateLimits).where(eq(rateLimits.ownerId, concurrentOwner));
    }
  });
});

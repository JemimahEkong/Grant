import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CATALOG_DEFAULT_PRICE_BASE_UNITS, ensureBaseOffer } from "../lib/catalog/offers";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { offers, tracks } from "../lib/db/schema";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;
const sourceId = `test-offer-${randomUUID()}`;
const trackId = `freesound-${sourceId}`;
let client: ReturnType<typeof createDatabase>;
let db: GrantDatabase;

beforeAll(async () => {
  if (!testDatabaseUrl) return;
  client = createDatabase(testDatabaseUrl, { max: 1, idleTimeoutMillis: 1_000, connectionTimeoutMillis: 30_000 });
  db = client.db;
  await db.insert(tracks).values({
    id: trackId,
    title: "Test Music",
    sellerId: "grant-catalog",
    durationSeconds: 45,
    source: "freesound",
    sourceUrl: "https://example.com/source",
    sourceId,
    sourceAuthor: "Test Author",
    licenseCode: "cc0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attributionRequired: false,
    attributionText: "CC0 · public domain",
    commercialUse: true,
    derivatives: true,
    standaloneRedistribution: true,
    previewAllowed: true,
    genre: "electronic",
    moods: ["warm", "minimal"],
    energy: 3,
    instrumental: true,
    bpm: null,
    key: null,
    previewKey: null,
    authorityComposition: true,
    authorityMaster: true,
    provenanceReference: "Test source",
    isFixture: true,
  });
}, 30_000);

afterAll(async () => {
  if (!testDatabaseUrl) return;
  await db.delete(offers).where(eq(offers.trackId, trackId));
  await db.delete(tracks).where(eq(tracks.id, trackId));
  await client.close();
}, 30_000);

dbDescribe("base offer generation", () => {
  it("creates one validated active base offer and does not duplicate on re-run", async () => {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId)).limit(1);
    if (!track) throw new Error("Test track missing.");
    const first = await ensureBaseOffer(db, track);
    expect(first.created).toBe(true);
    const second = await ensureBaseOffer(db, track);
    expect(second.created).toBe(false);
    expect(second.offerId).toBe(first.offerId);

    const rows = await db
      .select()
      .from(offers)
      .where(and(eq(offers.trackId, trackId), eq(offers.kind, "base")));
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(true);
    expect(rows[0].expiresAt).toBeNull();
    expect(rows[0].amountBaseUnits).toBe(CATALOG_DEFAULT_PRICE_BASE_UNITS);
    expect(rows[0].payeeAddress).toBe(process.env.X402_SELLER_PUBLIC);
    expect(rows[0].platformsPaidAd).toContain("instagram");
    expect(rows[0].clientDelivery).toBe(true);
  }, 30_000);
});

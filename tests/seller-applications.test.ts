import { Keypair } from "@stellar/stellar-sdk";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as apply } from "../app/api/sellers/applications/route";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { randomId } from "../lib/db/crypto";
import { createSellerApplication } from "../lib/db/repositories";
import { purchases, sellerApplications } from "../lib/db/schema";
import { assertPayeeIsNotTreasury } from "../lib/payments/payee-guard";
import { isStellarPublicKey } from "../lib/payments/stellar-address";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;
const seller = Keypair.random();
const treasury = Keypair.random();
let client: ReturnType<typeof createDatabase> | undefined;
let db: GrantDatabase;
let applicationId: string;
let ownerId: string;

describe("seller application validation", () => {
  it("accepts a valid seller public key and rejects a malformed one", () => {
    expect(isStellarPublicKey(seller.publicKey())).toBe(true);
    expect(isStellarPublicKey("GNOTAKEY")).toBe(false);
  });

  it("rejects the faucet treasury as a seller payout address", () => {
    expect(() =>
      assertPayeeIsNotTreasury(treasury.publicKey(), { FAUCET_TREASURY_SECRET: treasury.secret() }),
    ).toThrowError(expect.objectContaining({ code: "PAYEE_IS_TREASURY" }));
    expect(() =>
      assertPayeeIsNotTreasury(seller.publicKey(), { FAUCET_TREASURY_SECRET: treasury.secret() }),
    ).not.toThrow();
  });

  it("keeps the application route behind a session", async () => {
    const response = await apply(
      new Request("http://localhost/api/sellers/applications", {
        method: "POST",
        headers: { origin: "http://localhost", "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(401);
  });
});

dbDescribe("seller application persistence", () => {
  beforeAll(() => {
    if (!testDatabaseUrl) return;
    client = createDatabase(testDatabaseUrl, {
      max: 1,
      idleTimeoutMillis: 1_000,
      connectionTimeoutMillis: 30_000,
    });
    db = client.db;
    ownerId = randomId("test-seller-owner");
  });

  afterAll(async () => {
    if (db && applicationId) {
      await db.delete(sellerApplications).where(eq(sellerApplications.id, applicationId));
    }
    if (client) await client.close();
  });

  it("creates a listing with status submitted and no payout", async () => {
    const before = await db.select().from(purchases).where(eq(purchases.ownerId, ownerId));
    const application = await createSellerApplication(db, {
      ownerId,
      name: "Test Seller",
      email: "seller@example.com",
      payoutAddress: seller.publicKey(),
      catalogueUrl: "https://example.com/catalogue",
      termsGranted: "Organic social use, worldwide, 90 days, client delivery allowed. No paid ads.",
    });
    applicationId = application.id;

    expect(application.id.startsWith("sap_")).toBe(true);
    expect(application.status).toBe("submitted");
    expect(application.ownerId).toBe(ownerId);

    const rows = await db.select().from(sellerApplications).where(eq(sellerApplications.id, application.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("submitted");

    const after = await db.select().from(purchases).where(eq(purchases.ownerId, ownerId));
    expect(after).toHaveLength(before.length);
  });
});

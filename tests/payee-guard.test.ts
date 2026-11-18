import { Keypair } from "@stellar/stellar-sdk";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stellarTestnetUsdc } from "../demo/catalog";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { randomId } from "../lib/db/crypto";
import {
  assertActiveOffersDoNotPayTreasury,
  assertPayeeIsNotTreasury,
  treasuryPublicKeyFromEnv,
} from "../lib/payments/payee-guard";
import { offers } from "../lib/db/schema";
import { seedDemoCatalog } from "../lib/db/seed";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;
const treasury = Keypair.random();
const seller = Keypair.random();
const env = { FAUCET_TREASURY_SECRET: treasury.secret() };
let client: ReturnType<typeof createDatabase>;
let db: GrantDatabase;
let offerId: string;

describe("seller payee guard", () => {
  it("rejects a payee that equals the treasury public key", () => {
    expect(() => assertPayeeIsNotTreasury(treasury.publicKey(), env)).toThrowError(
      expect.objectContaining({ code: "PAYEE_IS_TREASURY" }),
    );
    expect(() => assertPayeeIsNotTreasury(seller.publicKey(), env)).not.toThrow();
    expect(() => assertPayeeIsNotTreasury(treasury.publicKey(), {})).not.toThrow();
  });

  it("rejects a malformed treasury secret instead of guessing", () => {
    expect(() => treasuryPublicKeyFromEnv({ FAUCET_TREASURY_SECRET: "not-a-stellar-secret" })).toThrowError(
      expect.objectContaining({ code: "TREASURY_CONFIGURATION_INVALID" }),
    );
  });
});

dbDescribe("active offer treasury guard", () => {
  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    client = createDatabase(testDatabaseUrl);
    db = client.db;
    await seedDemoCatalog(db);
    offerId = randomId("guard-offer");
    await db.insert(offers).values({
      id: offerId,
      version: 1,
      trackId: "morning-edit",
      sellerId: "seller-demo-morning",
      kind: "base",
      parentOfferId: null,
      parentOfferVersion: null,
      authorityComposition: true,
      authorityMaster: true,
      platformsOrganic: ["instagram", "facebook", "tiktok", "youtube"],
      platformsPaidAd: ["instagram", "facebook", "tiktok", "youtube"],
      territoryWorldwide: true,
      territoryCountries: [],
      maximumTermDays: 90,
      maximumClipSeconds: 60,
      clientDelivery: true,
      reposting: false,
      futureCampaigns: false,
      amountBaseUnits: 10_000_000n,
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      assetDecimals: stellarTestnetUsdc.assetDecimals,
      payeeAddress: treasury.publicKey(),
      active: true,
      activeFrom: new Date("2020-01-01T00:00:00Z"),
      expiresAt: null,
    });
  }, 30_000);

  afterAll(async () => {
    if (!testDatabaseUrl) return;
    await db.delete(offers).where(eq(offers.id, offerId));
    await client.close();
  }, 30_000);

  it("fails closed while any active offer still pays the treasury", async () => {
    await expect(assertActiveOffersDoNotPayTreasury(db, env)).rejects.toMatchObject({
      code: "ACTIVE_OFFER_PAYS_TREASURY",
    });
    await db.update(offers).set({ active: false }).where(eq(offers.id, offerId));
    await expect(assertActiveOffersDoNotPayTreasury(db, env)).resolves.toBeUndefined();
  });
});

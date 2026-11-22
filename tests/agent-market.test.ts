import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "@neondatabase/serverless";
import {
  canonical,
  challengeTermsRefusal,
  coverageRefusals,
  priceRefusal,
  sameTerms,
  sellerPayloadTerms,
  type BriefTerms,
} from "../lib/agent-market/coverage";
import { marketTermsSchema } from "../lib/agent-market/terms";

const baseTerms = marketTermsSchema.parse({
  platforms: ["tiktok"],
  termDays: 90,
  territory: { worldwide: true, countries: [] },
  paidAds: false,
  clientDelivery: false,
  reposting: false,
  futureCampaigns: false,
  licenseCode: "cc0",
  attributionText: "CC0 · public domain",
  previewAllowed: true,
});

const baseBrief: BriefTerms = {
  platforms: ["tiktok"],
  termDays: 90,
  territory: { worldwide: true, countries: [] },
  paidAds: false,
  clientDelivery: false,
  reposting: false,
  futureCampaigns: false,
  clipSeconds: 20,
};

describe("agent market coverage", () => {
  it("maps a seller payload to brief coverage", () => {
    const payload = {
      platforms: ["tiktok", "youtube"],
      termDays: 90,
      territory: { worldwide: true, countries: [] },
      paidAds: true,
      clientDelivery: true,
      reposting: false,
      futureCampaigns: false,
      licenseCode: "cc0",
      attributionText: "CC0 · public domain",
      previewAllowed: true,
    };
    const terms = sellerPayloadTerms(payload);
    expect(coverageRefusals({ ...baseBrief, paidAds: true, clientDelivery: true }, terms, 60)).toEqual([]);
  });

  it.each([
    ["PLATFORM_NOT_COVERED", { platforms: ["instagram" as const] }, undefined],
    ["TERM_TOO_SHORT", {}, { termDays: 30 }],
    ["PAID_ADS_NOT_OFFERED", { paidAds: true }, undefined],
    ["CLIENT_DELIVERY_NOT_OFFERED", { clientDelivery: true }, undefined],
    ["REPOSTING_NOT_OFFERED", { reposting: true }, undefined],
    ["FUTURE_CAMPAIGNS_NOT_OFFERED", { futureCampaigns: true }, undefined],
    ["CLIP_TOO_LONG", { clipSeconds: 90 }, undefined],
    ["TERRITORY_NOT_COVERED", {}, { territory: { worldwide: false, countries: ["NG"] } }],
  ])("refuses %s", (code, briefOverride, termsOverride) => {
    const terms = marketTermsSchema.parse({ ...baseTerms, ...termsOverride });
    const refusals = coverageRefusals({ ...baseBrief, ...briefOverride }, terms, 60);
    expect(refusals.map(refusal => refusal.code)).toContain(code);
  });

  it("refuses prices above max and above budget", () => {
    expect(priceRefusal(10_000_000n, 5_000_000n, 20_000_000n)?.code).toBe("PRICE_ABOVE_MAX");
    expect(priceRefusal(10_000_000n, 20_000_000n, 5_000_000n)?.code).toBe("PRICE_ABOVE_BUDGET");
    expect(priceRefusal(5_000_000n, 5_000_000n, 5_000_000n)).toBeNull();
  });

  it("refuses when challenge terms differ from the listing", () => {
    expect(challengeTermsRefusal(baseTerms, { ...baseTerms, paidAds: true })?.code).toBe("TERMS_CHANGED");
    expect(challengeTermsRefusal(baseTerms, { ...baseTerms })).toBeNull();
    expect(sameTerms(baseTerms, { ...baseTerms })).toBe(true);
    expect(canonical({ b: 1, a: 2 })).toBe(canonical({ a: 2, b: 1 }));
  });
});

describe("seller license replay", () => {
  const transactionHash = `test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const licenseId = `sl_test_${Date.now()}`;
  const testDbUrl = process.env.DATABASE_URL_TEST;
  let cleanup: Pool | null = null;

  afterAll(async () => {
    if (!cleanup) return;
    await cleanup.query("delete from seller_licenses where transaction_hash = $1", [transactionHash]);
    await cleanup.end();
  });

  it("stores one license per authorization transaction hash", async () => {
    if (!testDbUrl) throw new Error("DATABASE_URL_TEST is required for the replay test.");
    process.env.SELLER_DATABASE_URL = testDbUrl;
    const store = await import("../seller/lib/store");
    const license = {
      id: licenseId,
      offerId: "morning-edit",
      title: "Morning Edit",
      artist: "Halcyon Fields",
      terms: baseTerms,
      issuedAt: new Date().toISOString(),
      transactionHash,
      settlementTransactionHash: "settlement-test-hash",
      payer: "GTESTBUYER",
      payee: "GTESTSELLER",
      amountBaseUnits: "10000000",
      asset: "TEST",
      network: "stellar:testnet",
    };
    const record = {
      transactionHash,
      licenseId,
      offerId: "morning-edit",
      license,
      payer: "GTESTBUYER",
      payee: "GTESTSELLER",
      amountBaseUnits: "10000000",
      asset: "TEST",
      network: "stellar:testnet",
      settlementTransactionHash: "settlement-test-hash",
      issuedAt: new Date(),
    };
    const first = await store.insertLicense(record);
    const second = await store.insertLicense(record);
    expect(second.licenseId).toBe(first.licenseId);
    cleanup = new Pool({ connectionString: testDbUrl, max: 1 });
    const count = await cleanup.query(
      "select count(*)::int as count from seller_licenses where transaction_hash = $1",
      [transactionHash],
    );
    expect(count.rows[0].count).toBe(1);
  }, 60_000);
});

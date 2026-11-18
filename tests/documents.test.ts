import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildLicensePdf, formatUsdc } from "../lib/documents/license-pdf";
import type { Brief } from "../lib/licensing/schema";

const brief: Brief = {
  intendedUse: "organic",
  platforms: ["instagram", "tiktok"],
  territory: { worldwide: true, countries: [] },
  termDays: 90,
  clipDurationSeconds: 30,
  clientDelivery: true,
  reposting: false,
  futureCampaigns: false,
};

describe("license PDF", () => {
  it("formats testnet USDC base units without floating point", () => {
    expect(formatUsdc("10000000")).toBe("1.0000000");
    expect(formatUsdc("100000")).toBe("0.0100000");
    expect(formatUsdc("0")).toBe("0.0000000");
  });

  it("builds a one-page PDF with the license record and demo disclosure", async () => {
    const bytes = await buildLicensePdf({
      licenseNumber: "GRANT-TEST-1",
      publicDisplayLabel: "Demo Client",
      trackTitle: "Morning Edit",
      sellerId: "seller-demo-morning",
      audioProvenance: "CC0 1.0 demo audio: Acoustic Guitar and Keys - Plains Soundtrack by tyballer92, Freesound 449812.",
      startsAt: new Date("2026-11-17T00:00:00Z"),
      endsAt: new Date("2027-02-15T00:00:00Z"),
      purchaseId: "pur_test",
      licenseId: "lic_test",
      request: brief,
      amountBaseUnits: "10000000",
      network: "stellar:testnet",
      payeeAddress: "GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB",
      transactionHash: "a".repeat(64),
    });
    expect(Buffer.from(bytes.subarray(0, 4)).toString("utf8")).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(800);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });
});

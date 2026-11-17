import { describe, expect, it } from "vitest";
import { createAttemptToken, verifyAttemptToken } from "../lib/payments/attempt-token";
import { usdcToBaseUnits } from "../lib/payments/verify-settlement";

const previousSecret = process.env.X402_ATTEMPT_SECRET;
process.env.X402_ATTEMPT_SECRET = "grant-attempt-test-secret-".padEnd(48, "x");

const payload = {
  purchaseId: "pur_test",
  attemptId: "att_test",
  priceBaseUnits: "10000000",
  network: "stellar:testnet" as const,
  assetContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  payeeAddress: "GBWSBWJGGL7EVHZPHQLOZTLOEDWZ2SQ4WCGX6YW5T4BXFQN74VMHLUMB",
};

describe("attempt token", () => {
  it("round-trips a purchase-scoped token", () => {
    const token = createAttemptToken(payload);
    const verified = verifyAttemptToken(token);
    expect(verified.purchaseId).toBe(payload.purchaseId);
    expect(verified.attemptId).toBe(payload.attemptId);
    expect(verified.priceBaseUnits).toBe(payload.priceBaseUnits);
    expect(verified.network).toBe("stellar:testnet");
  });

  it("rejects a tampered payload or signature", () => {
    const token = createAttemptToken(payload);
    const [body, signature] = token.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString("utf8")), priceBaseUnits: "1" }),
    ).toString("base64url");
    expect(() => verifyAttemptToken(`${tampered}.${signature}`)).toThrowError(
      expect.objectContaining({ code: "ATTEMPT_TOKEN_INVALID" }),
    );
    expect(() => verifyAttemptToken(`${body}.bad-signature`)).toThrowError(
      expect.objectContaining({ code: "ATTEMPT_TOKEN_INVALID" }),
    );
  });

  it("rejects an expired token", () => {
    const token = createAttemptToken(payload, new Date(Date.now() - 10 * 60 * 1000), 60);
    expect(() => verifyAttemptToken(token)).toThrowError(expect.objectContaining({ code: "ATTEMPT_TOKEN_EXPIRED" }));
  });

  it("fails closed without a configured secret", () => {
    const saved = process.env.X402_ATTEMPT_SECRET;
    delete process.env.X402_ATTEMPT_SECRET;
    try {
      expect(() => createAttemptToken(payload)).toThrowError(
        expect.objectContaining({ code: "ATTEMPT_SECRET_NOT_CONFIGURED" }),
      );
    } finally {
      process.env.X402_ATTEMPT_SECRET = saved;
    }
  });
});

describe("USDC base-unit conversion", () => {
  it("converts 7-decimal balances without floating point", () => {
    expect(usdcToBaseUnits("0.01")).toBe(100_000n);
    expect(usdcToBaseUnits("1.00")).toBe(10_000_000n);
    expect(usdcToBaseUnits("18.98")).toBe(189_800_000n);
    expect(usdcToBaseUnits("0")).toBe(0n);
  });
});

process.env.X402_ATTEMPT_SECRET = previousSecret;

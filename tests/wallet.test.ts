import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { decryptWalletSecret, encryptWalletSecret } from "../lib/wallet/crypto";
import { formatStellarAmount, usdcBaseUnits } from "../lib/wallet/stellar";

process.env.WALLET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

describe("wallet secret encryption", () => {
  it("round-trips a Stellar secret with AES-256-GCM", () => {
    const secret = Keypair.random().secret();
    const encrypted = encryptWalletSecret(secret);
    expect(encrypted.encryptedSecret).not.toContain(secret);
    expect(encrypted.secretIv.length).toBeGreaterThan(0);
    expect(decryptWalletSecret(encrypted.encryptedSecret, encrypted.secretIv)).toBe(secret);
  });

  it("fails closed with a different key or malformed ciphertext", () => {
    const secret = Keypair.random().secret();
    const encrypted = encryptWalletSecret(secret);
    process.env.WALLET_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString("base64");
    expect(() => decryptWalletSecret(encrypted.encryptedSecret, encrypted.secretIv)).toThrowError(
      expect.objectContaining({ code: "WALLET_DECRYPT_FAILED" }),
    );
    process.env.WALLET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    expect(() => decryptWalletSecret("not-a-valid-payload", encrypted.secretIv)).toThrow();
    expect(() => encryptWalletSecret("S-not-a-secret")).toThrowError(
      expect.objectContaining({ code: "WALLET_SECRET_INVALID" }),
    );
  });
});

describe("Stellar amount conversion", () => {
  it("formats and parses seven-decimal USDC amounts without floating point", () => {
    expect(formatStellarAmount(5_000_0000n)).toBe("5.0000000");
    expect(formatStellarAmount(100_000n)).toBe("0.0100000");
    expect(usdcBaseUnits("5.0000000")).toBe(50_000_000n);
    expect(usdcBaseUnits("0.0100000")).toBe(100_000n);
  });
});


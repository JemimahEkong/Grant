import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { RepositoryError } from "../db/errors";

const ivLength = 12;
const authTagLength = 16;

function encryptionKey(): Buffer {
  const value = process.env.WALLET_ENCRYPTION_KEY;
  if (!value) {
    throw new RepositoryError("WALLET_ENCRYPTION_NOT_CONFIGURED", "Wallet encryption is not configured.", 503);
  }
  const key = Buffer.from(value, "base64");
  if (key.byteLength !== 32) {
    throw new RepositoryError("WALLET_ENCRYPTION_INVALID", "Wallet encryption key must be 32 bytes.", 503);
  }
  return key;
}

export function encryptWalletSecret(secret: string): { encryptedSecret: string; secretIv: string } {
  if (!/^S[A-Z2-7]{55}$/.test(secret)) {
    throw new RepositoryError("WALLET_SECRET_INVALID", "The Stellar secret is malformed.", 400);
  }
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedSecret: Buffer.concat([ciphertext, tag]).toString("base64"),
    secretIv: iv.toString("base64"),
  };
}

export function decryptWalletSecret(encryptedSecret: string, secretIv: string): string {
  const payload = Buffer.from(encryptedSecret, "base64");
  if (payload.byteLength <= authTagLength) {
    throw new RepositoryError("WALLET_SECRET_INVALID", "The encrypted wallet secret is malformed.", 500);
  }
  const ciphertext = payload.subarray(0, payload.byteLength - authTagLength);
  const tag = payload.subarray(payload.byteLength - authTagLength);
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(secretIv, "base64"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new RepositoryError("WALLET_DECRYPT_FAILED", "The wallet secret could not be decrypted.", 500);
  }
}

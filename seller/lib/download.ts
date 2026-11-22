import { createHmac, timingSafeEqual } from "node:crypto";

type TokenPayload = {
  licenseId: string;
  offerId: string;
  exp: number;
};

function secret(): string {
  const value = process.env.SELLER_DOWNLOAD_SECRET;
  if (!value) throw new Error("SELLER_DOWNLOAD_SECRET is not configured.");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createDownloadToken(input: { licenseId: string; offerId: string; expiresInSeconds?: number }): string {
  const payload: TokenPayload = {
    licenseId: input.licenseId,
    offerId: input.offerId,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 300),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyDownloadToken(token: string | null): TokenPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = Buffer.from(sign(encoded));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
    if (!payload.licenseId || !payload.offerId || !Number.isFinite(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { RepositoryError } from "../db/errors";

const attemptPayloadSchema = z.strictObject({
  purchaseId: z.string().min(1),
  attemptId: z.string().min(1),
  priceBaseUnits: z.string().regex(/^(0|[1-9]\d{0,18})$/),
  network: z.literal("stellar:testnet"),
  assetContractId: z.string().min(1),
  payeeAddress: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export type AttemptTokenPayload = z.infer<typeof attemptPayloadSchema>;
export type AttemptTokenInput = Omit<AttemptTokenPayload, "expiresAt">;

function attemptSecret(): string {
  const secret = process.env.X402_ATTEMPT_SECRET;
  if (!secret || secret.length < 32) {
    throw new RepositoryError("ATTEMPT_SECRET_NOT_CONFIGURED", "The attempt token secret is not configured.", 503);
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", attemptSecret()).update(body).digest("base64url");
}

export function createAttemptToken(input: AttemptTokenInput, now = new Date(), expiresInSeconds = 300): string {
  const payload: AttemptTokenPayload = {
    ...input,
    expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyAttemptToken(token: string, now = new Date()): AttemptTokenPayload {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) {
    throw new RepositoryError("ATTEMPT_TOKEN_INVALID", "The attempt token is malformed.", 403);
  }
  const expected = sign(body);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.byteLength !== expectedBuffer.byteLength || !timingSafeEqual(provided, expectedBuffer)) {
    throw new RepositoryError("ATTEMPT_TOKEN_INVALID", "The attempt token signature is invalid.", 403);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new RepositoryError("ATTEMPT_TOKEN_INVALID", "The attempt token payload is invalid.", 403);
  }
  const payload = attemptPayloadSchema.parse(parsed);
  if (new Date(payload.expiresAt) <= now) {
    throw new RepositoryError("ATTEMPT_TOKEN_EXPIRED", "The attempt token has expired.", 403);
  }
  return payload;
}

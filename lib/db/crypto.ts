import { createHash, randomBytes, randomUUID } from "node:crypto";

export function randomId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function sha256Raw(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const item = source[key];
      if (item !== undefined) result[key] = normalize(item);
    }
    return result;
  }
  throw new TypeError("Value is not canonical-JSON compatible.");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

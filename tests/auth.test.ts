import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isDemoAllowlisted } from "../lib/auth/allowlist";
import { assertSameOrigin } from "../lib/auth/origin";
import { createAuth } from "../lib/auth/server";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { account, session, user } from "../lib/db/schema";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;
const testEmail = `auth-test-${randomUUID()}@example.com`;
const blockedEmail = `auth-blocked-${randomUUID()}@example.com`;
const password = "grant-test-password-12345";

let client: ReturnType<typeof createDatabase>;
let db: GrantDatabase;
let auth: ReturnType<typeof createAuth>;

function requestWithOrigin(url: string, origin: string | null) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(url, { method: "POST", headers });
}

describe("demo allowlist and origin policy", () => {
  it("fails closed when the allowlist is empty", () => {
    const previous = process.env.DEMO_ALLOWLIST_EMAILS;
    delete process.env.DEMO_ALLOWLIST_EMAILS;
    try {
      expect(isDemoAllowlisted("anyone@example.com")).toBe(false);
      expect(isDemoAllowlisted(null)).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.DEMO_ALLOWLIST_EMAILS;
      else process.env.DEMO_ALLOWLIST_EMAILS = previous;
    }
  });

  it("matches allowlisted emails case-insensitively", () => {
    const previous = process.env.DEMO_ALLOWLIST_EMAILS;
    process.env.DEMO_ALLOWLIST_EMAILS = "Founder@Example.com, demo@grant.local";
    try {
      expect(isDemoAllowlisted("founder@example.com")).toBe(true);
      expect(isDemoAllowlisted("FOUNDER@EXAMPLE.COM")).toBe(true);
      expect(isDemoAllowlisted("other@example.com")).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.DEMO_ALLOWLIST_EMAILS;
      else process.env.DEMO_ALLOWLIST_EMAILS = previous;
    }
  });

  it("requires a same-origin Origin header on mutating requests", () => {
    expect(() =>
      assertSameOrigin(requestWithOrigin("http://localhost:3000/api/projects", "http://localhost:3000")),
    ).not.toThrow();
    expect(() => assertSameOrigin(requestWithOrigin("http://localhost:3000/api/projects", null))).toThrowError(
      expect.objectContaining({ code: "ORIGIN_REQUIRED" }),
    );
    expect(() =>
      assertSameOrigin(requestWithOrigin("http://localhost:3000/api/projects", "https://evil.example")),
    ).toThrowError(expect.objectContaining({ code: "ORIGIN_FORBIDDEN" }));
  });

  it("allows an explicitly trusted application origin", () => {
    const previous = process.env.APP_ORIGIN;
    process.env.APP_ORIGIN = "https://grant.example";
    try {
      expect(() =>
        assertSameOrigin(requestWithOrigin("http://localhost:3000/api/projects", "https://grant.example")),
      ).not.toThrow();
    } finally {
      if (previous === undefined) delete process.env.APP_ORIGIN;
      else process.env.APP_ORIGIN = previous;
    }
  });
});

dbDescribe("Better Auth with the Drizzle adapter", () => {
  beforeAll(() => {
    if (!testDatabaseUrl) return;
    client = createDatabase(testDatabaseUrl);
    db = client.db;
    auth = createAuth(db, {
      secret: "grant-auth-test-secret-".padEnd(48, "x"),
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
    });
  }, 30_000);

  afterAll(async () => {
    if (!testDatabaseUrl) return;
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(inArray(user.email, [testEmail, blockedEmail]));
    const ids = rows.map(row => row.id);
    if (ids.length > 0) {
      await db.delete(session).where(inArray(session.userId, ids));
      await db.delete(account).where(inArray(account.userId, ids));
      await db.delete(user).where(inArray(user.id, ids));
    }
    await client.close();
  }, 30_000);

  it("creates an allowlisted email/password user and resolves its session", async () => {
    const signUp = await auth.api.signUpEmail({
      body: { email: testEmail, password, name: "Auth Test" },
      returnHeaders: true,
    });
    expect(signUp.response.user.email).toBe(testEmail);
    const setCookies = signUp.headers.getSetCookie?.() ?? [signUp.headers.get("set-cookie") ?? ""];
    const cookieHeader = setCookies.map(value => value.split(";")[0]).filter(Boolean).join("; ");
    expect(cookieHeader.length).toBeGreaterThan(0);

    const resolved = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) });
    expect(resolved?.user.email).toBe(testEmail);
    expect(resolved?.session.userId).toBe(signUp.response.user.id);
  });

  it("allows a non-allowlisted user to register without spending access", async () => {
    const signUp = await auth.api.signUpEmail({
      body: { email: blockedEmail, password, name: "Non Demo User" },
    });
    expect(signUp.user.email).toBe(blockedEmail);
    expect(isDemoAllowlisted(blockedEmail)).toBe(false);
  });
});

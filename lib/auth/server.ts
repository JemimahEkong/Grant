import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import type { GrantDatabase } from "../db/client";
import { getDatabase } from "../db/client";
import * as schema from "../db/schema";
import { getDemoAllowlist } from "./allowlist";
import { getTrustedOrigins } from "./origin";

export type CreateAuthOptions = {
  secret?: string;
  baseURL?: string;
  allowlistEmails?: string[];
  trustedOrigins?: string[];
  google?: { clientId: string; clientSecret: string } | null;
};

export function createAuth(database: GrantDatabase, options: CreateAuthOptions = {}) {
  const allowlist = (options.allowlistEmails ?? getDemoAllowlist()).map(email => email.trim().toLowerCase()).filter(Boolean);
  const google =
    options.google ??
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : null);

  return betterAuth({
    appName: "Grant",
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    socialProviders: google ? { google } : {},
    trustedOrigins: options.trustedOrigins ?? getTrustedOrigins(),
    databaseHooks: {
      user: {
        create: {
          before: async user => {
            const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
            if (!allowlist.includes(email)) {
              throw new APIError("FORBIDDEN", {
                message: "This email is not on the Grant demo allowlist.",
              });
            }
            return { data: user };
          },
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: {
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!auth) auth = createAuth(getDatabase());
  return auth;
}

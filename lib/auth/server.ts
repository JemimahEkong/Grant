import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import type { GrantDatabase } from "../db/client";
import { getDatabase } from "../db/client";
import * as schema from "../db/schema";
import { getTrustedOrigins } from "./origin";

export type CreateAuthOptions = {
  secret?: string;
  baseURL?: string;
  trustedOrigins?: string[];
};

export function createAuth(database: GrantDatabase, options: CreateAuthOptions = {}) {
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
    trustedOrigins: options.trustedOrigins ?? getTrustedOrigins(),
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

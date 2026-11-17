import { headers } from "next/headers";
import { RepositoryError } from "../db/errors";
import { isDemoAllowlisted } from "./allowlist";
import { getAuth } from "./server";

export type DemoAuthContext = {
  ownerId: string;
  demoAllowlisted: boolean;
  user: { id: string; email: string; name: string };
  session: { id: string; expiresAt: Date };
};

type SessionResult = Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>;

async function readSession(requestHeaders?: Headers): Promise<SessionResult> {
  return getAuth().api.getSession({
    headers: requestHeaders ?? (await headers()),
  });
}

export async function getOptionalDemoSession(requestHeaders?: Headers): Promise<DemoAuthContext | null> {
  const result = await readSession(requestHeaders);
  if (!result?.user) return null;
  return {
    ownerId: result.user.id,
    demoAllowlisted: isDemoAllowlisted(result.user.email),
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    session: { id: result.session.id, expiresAt: result.session.expiresAt },
  };
}

export async function requireDemoSession(requestHeaders?: Headers): Promise<DemoAuthContext> {
  const result = await readSession(requestHeaders);
  if (!result?.user) {
    throw new RepositoryError("UNAUTHENTICATED", "Sign in to continue.", 401);
  }
  return {
    ownerId: result.user.id,
    demoAllowlisted: isDemoAllowlisted(result.user.email),
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    session: { id: result.session.id, expiresAt: result.session.expiresAt },
  };
}

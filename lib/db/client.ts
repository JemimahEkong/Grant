import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { RepositoryError } from "./errors";
import * as schema from "./schema";

export type GrantDatabase = ReturnType<typeof createDatabase>["db"];
export type DatabaseTransaction = Parameters<Parameters<GrantDatabase["transaction"]>[0]>[0];

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env, name = "DATABASE_URL"): string {
  const value = env[name];
  if (!value) {
    throw new RepositoryError("DATABASE_NOT_CONFIGURED", `${name} is not configured.`, 503);
  }
  if (!/^postgres(?:ql)?:\/\//.test(value)) {
    throw new RepositoryError("DATABASE_URL_INVALID", `${name} is not a PostgreSQL connection string.`, 503);
  }
  return value;
}

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    close: async () => {
      await pool.end();
    },
  };
}

type GlobalDatabase = typeof globalThis & {
  __grantDatabase?: ReturnType<typeof createDatabase>;
};

const globalDatabase = globalThis as GlobalDatabase;

export function getDatabase() {
  if (!globalDatabase.__grantDatabase) {
    globalDatabase.__grantDatabase = createDatabase(resolveDatabaseUrl());
  }
  return globalDatabase.__grantDatabase.db;
}

export function getDatabasePool() {
  if (!globalDatabase.__grantDatabase) {
    globalDatabase.__grantDatabase = createDatabase(resolveDatabaseUrl());
  }
  return globalDatabase.__grantDatabase.pool;
}

export async function closeDatabase() {
  const current = globalDatabase.__grantDatabase;
  if (!current) return;
  globalDatabase.__grantDatabase = undefined;
  await current.close();
}

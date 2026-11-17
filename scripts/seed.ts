import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { seedDemoCatalog } from "../lib/db/seed";

async function main() {
  const useTestDatabase = process.argv.includes("--test");
  const envName = useTestDatabase ? "DATABASE_URL_TEST" : "DATABASE_URL";
  const database = createDatabase(resolveDatabaseUrl(process.env, envName));

  try {
    const result = await seedDemoCatalog(database.db);
    console.log(`Seed complete. Fixture tracks: ${result.tracks}. Fixture offers: ${result.offers}.`);
  } finally {
    await database.close();
  }
}

main().catch(error => {
  console.error("Seed failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const useTestDatabase = process.argv.includes("--test");
const envName = useTestDatabase ? "DATABASE_URL_TEST" : "DATABASE_URL";
const connectionString = process.env[envName];

if (!connectionString) {
  console.error(`${envName} is not configured. Add it to your ignored .env.local file.`);
  process.exit(1);
}
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) {
  console.error(`${envName} is not a PostgreSQL connection string.`);
  process.exit(1);
}

try {
  const sql = neon(connectionString);
  const database = drizzle(sql);
  await migrate(database, { migrationsFolder: "drizzle" });
  console.log(`Migrations applied to the ${useTestDatabase ? "test" : "main"} database.`);
} catch {
  console.error("Migration failed. Connection and provider details were withheld.");
  process.exit(1);
}

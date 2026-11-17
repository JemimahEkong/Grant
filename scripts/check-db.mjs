import { neon } from "@neondatabase/serverless";

const useTestDatabase = process.argv.includes("--test");
const envName = useTestDatabase ? "DATABASE_URL_TEST" : "DATABASE_URL";
const connectionString = process.env[envName];

if (!connectionString) {
  console.error(`${envName} is not configured. Add it to your ignored .env.local file.`);
  process.exitCode = 1;
} else {
  try {
    const sql = neon(connectionString);
    const result = await sql`SELECT 1 AS connected`;
    if (result[0]?.connected !== 1) throw new Error("Unexpected database response.");
    console.log(`Neon ${useTestDatabase ? "test" : "main"} database connectivity verified. No schema or data was changed.`);
  } catch {
    console.error("Neon connectivity check failed. Connection credentials and provider details were withheld.");
    process.exitCode = 1;
  }
}

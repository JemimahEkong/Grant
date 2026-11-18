import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { demoTracks } from "../demo/catalog";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { artifacts, licenses, tracks } from "../lib/db/schema";
import { putPrivateObject } from "../lib/storage/r2";

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

async function main() {
  for (const track of demoTracks) {
    const filePath = path.join(process.cwd(), "demo", "audio", `${track.id}.mp3`);
    const bytes = await readFile(filePath);
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const objectKey = `audio/${track.id}/${track.id}.mp3`;

    await putPrivateObject({ key: objectKey, body: bytes, contentType: "audio/mpeg" });
    const [updated] = await database.db
      .update(tracks)
      .set({
        audioObjectKey: objectKey,
        audioContentHash: contentHash,
        durationSeconds: track.durationSeconds,
        provenanceReference: track.provenanceReference,
      })
      .where(eq(tracks.id, track.id))
      .returning();
    if (!updated) throw new Error(`The ${track.id} track was not found.`);

    const licenseRows = await database.db
      .select({ id: licenses.id })
      .from(licenses)
      .where(eq(licenses.trackId, track.id));
    if (licenseRows.length > 0) {
      await database.db
        .update(artifacts)
        .set({ objectKey, contentHash, state: "ready", errorCode: null, updatedAt: new Date() })
        .where(and(eq(artifacts.kind, "audio"), inArray(artifacts.licenseId, licenseRows.map(row => row.id))));
    }

    console.log(`${track.id}: ${objectKey}`);
    console.log(`  bytes ${bytes.byteLength} | sha256 ${contentHash} | repointed artifacts ${licenseRows.length}`);
  }
}

main()
  .catch(error => {
    console.error("Demo audio preparation failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

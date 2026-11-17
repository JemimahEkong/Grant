import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { buildDemoWav } from "../lib/documents/demo-audio";
import { tracks } from "../lib/db/schema";
import { putPrivateObject } from "../lib/storage/r2";

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

async function main() {
  const wav = buildDemoWav({ seconds: 2, frequency: 440 });
  const contentHash = createHash("sha256").update(wav).digest("hex");
  const objectKey = "audio/morning-edit/demo-tone.wav";
  await putPrivateObject({ key: objectKey, body: wav, contentType: "audio/wav" });
  const [track] = await database.db
    .update(tracks)
    .set({
      audioObjectKey: objectKey,
      audioContentHash: contentHash,
      provenanceReference:
        "Synthetic placeholder tone for private storage and delivery verification. Not a licensed music track. No composition or master evidence supplied.",
    })
    .where(eq(tracks.id, "morning-edit"))
    .returning();
  if (!track) throw new Error("The morning-edit track was not found.");
  console.log(`Demo audio prepared: ${objectKey}`);
  console.log(`Bytes: ${wav.byteLength}`);
  console.log(`SHA-256: ${contentHash}`);
}

main()
  .catch(error => {
    console.error("Demo audio preparation failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

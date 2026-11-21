import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { eq, isNull, and } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { tracks } from "../lib/db/schema";
import { getR2Client, putPrivateObject, resolveR2Config } from "../lib/storage/r2";

const execFileAsync = promisify(execFile);
const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

async function localFile(trackId: string): Promise<string | null> {
  const candidate = path.join(process.cwd(), "demo", "audio", `${trackId}.mp3`);
  try {
    await access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

async function downloadObject(key: string, destination: string): Promise<void> {
  const config = resolveR2Config();
  const client = getR2Client(config);
  const response = await client.send(new GetObjectCommand({ Bucket: config.bucketName, Key: key }));
  if (!response.Body) throw new Error("The stored audio object has no body.");
  const bytes = await response.Body.transformToByteArray();
  await writeFile(destination, bytes);
}

async function main() {
  const rows = await database.db
    .select({ id: tracks.id, audioObjectKey: tracks.audioObjectKey })
    .from(tracks)
    .where(and(isNull(tracks.previewKey), eq(tracks.previewAllowed, true)));

  console.log(`tracks needing a preview: ${rows.length}`);
  let created = 0;
  let skipped = 0;

  for (const track of rows) {
    const tempDir = await mkdtemp(path.join(tmpdir(), "grant-preview-"));
    try {
      const outputPath = path.join(tempDir, "preview.mp3");
      const local = await localFile(track.id);
      let inputPath = local;
      if (!inputPath) {
        if (!track.audioObjectKey) {
          skipped += 1;
          console.log(`${track.id}: skipped, no local file or stored audio key`);
          continue;
        }
        inputPath = path.join(tempDir, "source.mp3");
        await downloadObject(track.audioObjectKey, inputPath);
      }

      await execFileAsync(
        "ffmpeg",
        ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath, "-t", "40", "-ac", "1", "-b:a", "96k", outputPath],
        { timeout: 120_000 },
      );

      const previewBytes = await readFile(outputPath);
      const previewKey = `audio/previews/${track.id}.mp3`;
      await putPrivateObject({ key: previewKey, body: previewBytes, contentType: "audio/mpeg" });
      await database.db.update(tracks).set({ previewKey }).where(eq(tracks.id, track.id));
      created += 1;
      console.log(`${track.id}: ${previewKey} (${previewBytes.byteLength} bytes)`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  console.log(`created ${created}, skipped ${skipped}`);
}

main()
  .catch(error => {
    console.error("Preview preparation failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

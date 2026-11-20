import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { tracks } from "../db/schema";
import { putPrivateObject } from "../storage/r2";
import { draftMetadata, isDurationAllowed, licenseFactsFor, mapFreesoundLicense } from "./license-policy";
import type { CatalogCandidate } from "./types";

const execFileAsync = promisify(execFile);

export type CatalogIngestOutcome = {
  status: "accepted" | "skipped" | "rejected" | "failed";
  reason?: string;
  trackId?: string;
};

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { timeout: 30_000 },
  );
  const duration = Number(String(stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("ffprobe did not return a duration.");
  return duration;
}

async function makePreview(inputPath: string, outputPath: string, sourceDuration: number): Promise<void> {
  const seconds = Math.min(40, Math.max(15, Math.floor(sourceDuration)));
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-t",
      String(seconds),
      "-ac",
      "1",
      "-b:a",
      "96k",
      outputPath,
    ],
    { timeout: 120_000 },
  );
}

export async function ingestCandidate(
  db: GrantDatabase,
  candidate: CatalogCandidate,
  options: { sellerId?: string } = {},
): Promise<CatalogIngestOutcome> {
  const licenseCode = mapFreesoundLicense(candidate.licenseRaw);
  if (!licenseCode) return { status: "rejected", reason: "license_not_allowed" };
  if (!isDurationAllowed(candidate.durationSeconds)) {
    return { status: "rejected", reason: "duration_out_of_range" };
  }

  const [existing] = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(and(eq(tracks.source, candidate.source), eq(tracks.sourceId, candidate.sourceId)))
    .limit(1);
  if (existing) return { status: "skipped", reason: "already_ingested", trackId: existing.id };

  const audioResponse = await fetch(candidate.audioUrl);
  if (!audioResponse.ok) throw new Error(`Audio download failed with ${audioResponse.status}.`);
  const audioBytes = Buffer.from(await audioResponse.arrayBuffer());
  if (audioBytes.length < 1024) throw new Error("Audio download was empty.");
  const contentHash = createHash("sha256").update(audioBytes).digest("hex");

  const [duplicate] = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.audioContentHash, contentHash))
    .limit(1);
  if (duplicate) return { status: "rejected", reason: "duplicate_audio_hash", trackId: duplicate.id };

  const tempDir = await mkdtemp(path.join(tmpdir(), "grant-catalog-"));
  try {
    const sourcePath = path.join(tempDir, "source.mp3");
    const previewPath = path.join(tempDir, "preview.mp3");
    await writeFile(sourcePath, audioBytes);

    const duration = await probeDuration(sourcePath);
    if (!isDurationAllowed(duration)) return { status: "rejected", reason: "duration_out_of_range" };
    await makePreview(sourcePath, previewPath, duration);
    const previewBytes = await readFile(previewPath);

    const audioKey = `audio/catalog/freesound/${candidate.sourceId}.mp3`;
    const previewKey = `audio/previews/freesound/${candidate.sourceId}.mp3`;
    await putPrivateObject({ key: audioKey, body: audioBytes, contentType: "audio/mpeg" });
    await putPrivateObject({ key: previewKey, body: previewBytes, contentType: "audio/mpeg" });

    const facts = licenseFactsFor(licenseCode, {
      title: candidate.title,
      author: candidate.author,
      sourceUrl: candidate.sourceUrl,
    });
    const metadata = draftMetadata({
      title: candidate.title,
      tags: candidate.tags,
      description: candidate.description,
    });
    const trackId = `freesound-${candidate.sourceId}`;
    const values = {
      id: trackId,
      title: candidate.title,
      sellerId: options.sellerId ?? "grant-catalog",
      audioObjectKey: audioKey,
      audioContentHash: contentHash,
      durationSeconds: Math.round(duration),
      source: candidate.source,
      sourceUrl: candidate.sourceUrl,
      sourceId: candidate.sourceId,
      licenseCode,
      licenseUrl: facts.licenseUrl,
      attributionRequired: facts.attributionRequired,
      attributionText: facts.attributionText,
      commercialUse: facts.commercialUse,
      derivatives: facts.derivatives,
      standaloneRedistribution: facts.standaloneRedistribution,
      previewAllowed: facts.previewAllowed,
      genre: metadata.genre,
      moods: metadata.moods,
      energy: metadata.energy,
      instrumental: metadata.instrumental,
      bpm: null,
      key: null,
      previewKey,
      authorityComposition: true,
      authorityMaster: true,
      provenanceReference: `Source: ${candidate.sourceUrl}. ${facts.attributionText}`,
      isFixture: true,
    };
    await db
      .insert(tracks)
      .values(values)
      .onConflictDoUpdate({
        target: [tracks.source, tracks.sourceId],
        set: {
          title: values.title,
          sellerId: values.sellerId,
          audioObjectKey: values.audioObjectKey,
          audioContentHash: values.audioContentHash,
          durationSeconds: values.durationSeconds,
          sourceUrl: values.sourceUrl,
          licenseCode: values.licenseCode,
          licenseUrl: values.licenseUrl,
          attributionRequired: values.attributionRequired,
          attributionText: values.attributionText,
          commercialUse: values.commercialUse,
          derivatives: values.derivatives,
          standaloneRedistribution: values.standaloneRedistribution,
          previewAllowed: values.previewAllowed,
          genre: values.genre,
          moods: values.moods,
          energy: values.energy,
          instrumental: values.instrumental,
          bpm: values.bpm,
          key: values.key,
          previewKey: values.previewKey,
          authorityComposition: values.authorityComposition,
          authorityMaster: values.authorityMaster,
          provenanceReference: values.provenanceReference,
          isFixture: values.isFixture,
        },
      });
    return { status: "accepted", trackId };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

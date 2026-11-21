import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { offers, purchases, tracks, type TrackRow } from "../db/schema";
import { deletePrivateObject, putPrivateObject } from "../storage/r2";
import {
  draftMetadata,
  isDurationAllowed,
  isMusicCandidate,
  licenseFactsFor,
  mapFreesoundLicense,
} from "./license-policy";
import { ensureBaseOffer } from "./offers";
import type { CatalogCandidate } from "./types";

const execFileAsync = promisify(execFile);

export type CatalogIngestOutcome = {
  status: "accepted" | "skipped" | "rejected" | "failed";
  reason?: string;
  trackId?: string;
  offerId?: string;
  offerCreated?: boolean;
  removed?: boolean;
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
    ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath, "-t", String(seconds), "-ac", "1", "-b:a", "96k", outputPath],
    { timeout: 120_000 },
  );
}

async function removeTrack(db: GrantDatabase, track: TrackRow): Promise<void> {
  const [purchase] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(eq(purchases.trackId, track.id))
    .limit(1);
  if (purchase) throw new Error("Cannot remove a track that already has a purchase.");
  await db.delete(offers).where(eq(offers.trackId, track.id));
  await db.delete(tracks).where(eq(tracks.id, track.id));
  for (const key of [track.audioObjectKey, track.previewKey]) {
    if (!key) continue;
    try {
      await deletePrivateObject({ key });
    } catch {
      // The database row is the source of truth. Orphaned private objects are cleaned separately.
    }
  }
}

export async function ingestCandidate(
  db: GrantDatabase,
  candidate: CatalogCandidate,
  options: { sellerId?: string; payeeAddress?: string } = {},
): Promise<CatalogIngestOutcome> {
  const [existing] = await db
    .select()
    .from(tracks)
    .where(and(eq(tracks.source, candidate.source), eq(tracks.sourceId, candidate.sourceId)))
    .limit(1);

  const music = isMusicCandidate({
    title: candidate.title,
    tags: candidate.tags,
    description: candidate.description,
  });
  if (!music.ok) {
    if (existing) await removeTrack(db, existing);
    return { status: "rejected", reason: music.reason, removed: Boolean(existing), trackId: existing?.id };
  }

  const licenseCode = mapFreesoundLicense(candidate.licenseRaw);
  if (!licenseCode) {
    if (existing) await removeTrack(db, existing);
    return { status: "rejected", reason: "license_not_allowed", removed: Boolean(existing), trackId: existing?.id };
  }
  if (!isDurationAllowed(candidate.durationSeconds)) {
    if (existing) await removeTrack(db, existing);
    return { status: "rejected", reason: "duration_out_of_range", removed: Boolean(existing), trackId: existing?.id };
  }

  const facts = licenseFactsFor(licenseCode, {
    title: candidate.title,
    author: candidate.sourceAuthor,
    sourceUrl: candidate.sourceUrl,
  });
  const metadata = draftMetadata({
    title: candidate.title,
    tags: candidate.tags,
    description: candidate.description,
  });
  const provenanceReference = `Source: ${candidate.sourceUrl}. ${facts.attributionText}`;

  if (existing) {
    const [updated] = await db
      .update(tracks)
      .set({
        title: candidate.title,
        sourceAuthor: candidate.sourceAuthor,
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
        provenanceReference,
      })
      .where(eq(tracks.id, existing.id))
      .returning();
    if (!updated) throw new Error("The existing track could not be updated.");
    const offer = await ensureBaseOffer(db, updated, { payeeAddress: options.payeeAddress });
    return {
      status: "skipped",
      reason: "already_ingested",
      trackId: updated.id,
      offerId: offer.offerId,
      offerCreated: offer.created,
    };
  }

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

    const trackId = `freesound-${candidate.sourceId}`;
    const [inserted] = await db
      .insert(tracks)
      .values({
        id: trackId,
        title: candidate.title,
        sellerId: options.sellerId ?? "grant-catalog",
        audioObjectKey: audioKey,
        audioContentHash: contentHash,
        durationSeconds: Math.round(duration),
        source: candidate.source,
        sourceUrl: candidate.sourceUrl,
        sourceId: candidate.sourceId,
        sourceAuthor: candidate.sourceAuthor,
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
        provenanceReference,
        isFixture: true,
      })
      .onConflictDoUpdate({
        target: [tracks.source, tracks.sourceId],
        set: {
          title: candidate.title,
          sellerId: options.sellerId ?? "grant-catalog",
          audioObjectKey: audioKey,
          audioContentHash: contentHash,
          durationSeconds: Math.round(duration),
          sourceUrl: candidate.sourceUrl,
          sourceAuthor: candidate.sourceAuthor,
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
          provenanceReference,
          isFixture: true,
        },
      })
      .returning();
    if (!inserted) throw new Error("The track was not persisted.");
    const offer = await ensureBaseOffer(db, inserted, { payeeAddress: options.payeeAddress });
    return {
      status: "accepted",
      trackId: inserted.id,
      offerId: offer.offerId,
      offerCreated: offer.created,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

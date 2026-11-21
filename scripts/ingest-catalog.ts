import fs from "node:fs";
import { sql } from "drizzle-orm";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { FreesoundApiError, getFreesoundSound, normalizeFreesoundSound, searchFreesound } from "../lib/catalog/adapters/freesound";
import { ingestCandidate, type CatalogIngestOutcome } from "../lib/catalog/ingest";

const reportPath = "agent-state/catalog-ingest-report.json";
const jsonlPath = "agent-state/catalog-ingest.jsonl";
const startedAt = new Date().toISOString();
const targetTotal = 150;

function readLimit(): number {
  const inline = process.argv.find(argument => argument.startsWith("--limit="));
  if (inline) return Number(inline.split("=")[1]);
  const index = process.argv.indexOf("--limit");
  if (index >= 0) return Number(process.argv[index + 1]);
  return Number(process.env.CATALOG_INGEST_LIMIT ?? "50");
}

const requestedLimit = readLimit();
const limit = Math.max(1, Math.min(250, Number.isFinite(requestedLimit) ? requestedLimit : 50));
const apiKey = process.env.FREESOUND_API_KEY?.trim();

type ReportEntry = {
  at?: string;
  source?: string;
  sourceId?: string;
  title?: string;
  status?: string;
  reason?: string | null;
  trackId?: string;
  offerId?: string;
  offerCreated?: boolean;
  removed?: boolean;
};

const report = {
  status: "blocked",
  source: "freesound",
  reason: "FREESOUND_API_KEY is missing",
  startedAt,
  finishedAt: startedAt,
  requestedLimit: limit,
  targetTotal,
  totalTracksAtStart: 0,
  totalTracksAtEnd: 0,
  activeBaseOffersAtEnd: 0,
  orphanTracksAtEnd: 0,
  offersCreated: 0,
  removedTracks: 0,
  accepted: [] as ReportEntry[],
  rejected: [] as ReportEntry[],
  failed: [] as ReportEntry[],
  skipped: [] as ReportEntry[],
  rejectionReasons: {} as Record<string, number>,
};

function redact(value: string | null | undefined): string | null | undefined {
  if (!value || !apiKey) return value;
  return value.split(apiKey).join("[redacted]");
}

function bumpRejection(reason: string | null | undefined) {
  const key = redact(reason ?? "unknown") ?? "unknown";
  report.rejectionReasons[key] = (report.rejectionReasons[key] ?? 0) + 1;
}

function record(outcome: CatalogIngestOutcome, meta: { sourceId: string; title: string }) {
  const entry: ReportEntry = {
    at: new Date().toISOString(),
    source: "freesound",
    sourceId: meta.sourceId,
    title: meta.title,
    status: outcome.status,
    reason: redact(outcome.reason),
    trackId: outcome.trackId,
    offerId: outcome.offerId,
    offerCreated: outcome.offerCreated ?? false,
    removed: outcome.removed ?? false,
  };
  fs.appendFileSync(jsonlPath, JSON.stringify(entry) + "\n");
  if (entry.offerCreated) report.offersCreated += 1;
  if (entry.removed) report.removedTracks += 1;
  if (outcome.status === "accepted") report.accepted.push(entry);
  else if (outcome.status === "skipped") report.skipped.push(entry);
  else if (outcome.status === "rejected") {
    report.rejected.push(entry);
    bumpRejection(entry.reason);
  } else {
    report.failed.push(entry);
    bumpRejection(entry.reason);
  }
}

function writeReport() {
  const topRejectionReasons = Object.entries(report.rejectionReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify({ ...report, topRejectionReasons }, null, 2) + "\n");
}

function countValue(result: Awaited<ReturnType<ReturnType<typeof createDatabase>["db"]["execute"]>>): number {
  const rows = (result.rows ?? result) as Array<{ count: number | string }>;
  return Number(rows[0]?.count ?? 0);
}

async function catalogCounts(database: ReturnType<typeof createDatabase>) {
  const total = await database.db.execute(sql`select count(*)::int as count from tracks`);
  const activeBase = await database.db.execute(
    sql`select count(*)::int as count from offers where kind = 'base' and active = true`,
  );
  const orphans = await database.db.execute(
    sql`select count(*)::int as count from tracks t where not exists (select 1 from offers o where o.track_id = t.id and o.kind = 'base' and o.active = true)`,
  );
  return { total: countValue(total), activeBase: countValue(activeBase), orphans: countValue(orphans) };
}

function isAuthError(error: unknown): error is FreesoundApiError {
  return error instanceof FreesoundApiError && (error.status === 401 || error.status === 403);
}

async function main() {
  if (!apiKey) {
    writeReport();
    console.log("FREESOUND_API_KEY is missing. The Freesound adapter is built; no scraping was attempted.");
    console.log(`Blocked report written to ${reportPath}.`);
    process.exitCode = 1;
    return;
  }

  report.status = "running";
  report.reason = "";
  const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));
  const before = await catalogCounts(database);
  report.totalTracksAtStart = before.total;
  let totalTracks = before.total;
  let stop = false;
  const seen = new Set<string>();

  function stopForAuth(error: FreesoundApiError) {
    const reason = redact(`Freesound rejected the API key with HTTP ${error.status}: ${error.apiMessage ?? "No API message."}`);
    report.status = "blocked";
    report.reason = reason ?? "Freesound rejected the API key.";
    stop = true;
    process.exitCode = 1;
  }

  try {
    const existing = await database.db.execute(sql`
      select id, source_id from tracks
      where id like 'freesound-%'
        and (
          source_author is null
          or not exists (select 1 from offers o where o.track_id = tracks.id and o.kind = 'base' and o.active = true)
        )
      order by id
    `);
    const existingRows = (existing.rows ?? existing) as Array<{ id: string; source_id: string }>;

    for (const row of existingRows) {
      if (stop) break;
      try {
        const sound = await getFreesoundSound({ apiKey, id: row.source_id });
        const candidate = normalizeFreesoundSound(sound);
        if (!candidate) {
          record(
            { status: "failed", reason: "missing_preview", trackId: row.id },
            { sourceId: row.source_id, title: sound.name },
          );
          continue;
        }
        const outcome = await ingestCandidate(database.db, candidate);
        record(outcome, { sourceId: candidate.sourceId, title: candidate.title });
      } catch (error) {
        if (isAuthError(error)) {
          stopForAuth(error);
          break;
        }
        record(
          { status: "failed", reason: redact(error instanceof Error ? error.message : "backfill_failed") ?? "backfill_failed", trackId: row.id },
          { sourceId: row.source_id, title: row.id },
        );
      }
    }

    if (!stop) {
      const afterBackfill = await catalogCounts(database);
      totalTracks = afterBackfill.total;
      const searchLimit = Math.max(0, Math.min(limit, targetTotal - totalTracks));
      let newAccepted = 0;
      const queries = [
        "acoustic warm",
        "ambient minimal",
        "cinematic",
        "electronic driving",
        "uplifting playful",
        "tense gritty",
      ];

      for (const query of queries) {
        if (stop || newAccepted >= searchLimit) break;
        let page = 1;
        while (newAccepted < searchLimit) {
          let result;
          try {
            result = await searchFreesound({ apiKey, query, filter: "tag:music", page, pageSize: 50 });
          } catch (error) {
            if (isAuthError(error)) {
              stopForAuth(error);
              break;
            }
            record(
              { status: "failed", reason: redact(error instanceof Error ? error.message : "search_failed") ?? "search_failed" },
              { sourceId: `search:${query}:${page}`, title: query },
            );
            break;
          }
          if (result.candidates.length === 0) break;
          for (const candidate of result.candidates) {
            if (stop || newAccepted >= searchLimit) break;
            if (seen.has(candidate.sourceId)) continue;
            seen.add(candidate.sourceId);
            try {
              const outcome = await ingestCandidate(database.db, candidate);
              record(outcome, { sourceId: candidate.sourceId, title: candidate.title });
              if (outcome.status === "accepted") {
                newAccepted += 1;
                totalTracks += 1;
              }
            } catch (error) {
              if (isAuthError(error)) {
                stopForAuth(error);
                break;
              }
              record(
                { status: "failed", reason: redact(error instanceof Error ? error.message : "ingest_failed") ?? "ingest_failed" },
                { sourceId: candidate.sourceId, title: candidate.title },
              );
            }
          }
          if (stop || !result.next) break;
          page += 1;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    }

    const after = await catalogCounts(database);
    report.totalTracksAtEnd = after.total;
    report.activeBaseOffersAtEnd = after.activeBase;
    report.orphanTracksAtEnd = after.orphans;
    if (!stop) report.status = after.total >= targetTotal ? "completed" : "partial";
  } finally {
    writeReport();
    await database.close();
  }

  console.log(`Catalog ingest ${report.status}.`);
  console.log(`Track total ${report.totalTracksAtEnd}. Offers created ${report.offersCreated}. Orphan tracks ${report.orphanTracksAtEnd}.`);
  console.log(`Accepted ${report.accepted.length}, skipped ${report.skipped.length}, rejected ${report.rejected.length}, failed ${report.failed.length}.`);
  console.log(`Incremental log ${jsonlPath}. Summary ${reportPath}.`);
}

main().catch(error => {
  report.status = "failed";
  report.reason = redact(error instanceof Error ? error.message : "unknown_error") ?? "unknown_error";
  writeReport();
  console.error("Catalog ingest failed:", report.reason);
  process.exitCode = 1;
});

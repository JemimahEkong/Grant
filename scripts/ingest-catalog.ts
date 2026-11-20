import fs from "node:fs";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { searchFreesound } from "../lib/catalog/adapters/freesound";
import { ingestCandidate } from "../lib/catalog/ingest";

const reportPath = "agent-state/catalog-ingest-report.json";
const startedAt = new Date().toISOString();
const limit = Math.max(1, Math.min(250, Number(process.env.CATALOG_INGEST_LIMIT ?? "150")));
const apiKey = process.env.FREESOUND_API_KEY?.trim();

type ReportEntry = {
  sourceId?: string;
  title?: string;
  trackId?: string;
  reason?: string;
};

const report = {
  status: "blocked",
  source: "freesound",
  reason: "FREESOUND_API_KEY is missing",
  startedAt,
  finishedAt: startedAt,
  requestedLimit: limit,
  accepted: [] as ReportEntry[],
  rejected: [] as ReportEntry[],
  failed: [] as ReportEntry[],
  skipped: [] as ReportEntry[],
};

function writeReport() {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
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
  const queries = [
    "acoustic warm",
    "ambient minimal",
    "cinematic",
    "electronic driving",
    "uplifting playful",
    "tense gritty",
  ];
  const seen = new Set<string>();

  try {
    for (const query of queries) {
      if (report.accepted.length >= limit) break;
      let page = 1;
      while (report.accepted.length < limit) {
        let result;
        try {
          result = await searchFreesound({ apiKey, query, page, pageSize: 50 });
        } catch (error) {
          report.failed.push({ sourceId: `search:${query}:${page}`, reason: error instanceof Error ? error.message : "search_failed" });
          break;
        }
        if (result.candidates.length === 0) break;
        for (const candidate of result.candidates) {
          if (report.accepted.length >= limit) break;
          if (seen.has(candidate.sourceId)) continue;
          seen.add(candidate.sourceId);
          try {
            const outcome = await ingestCandidate(database.db, candidate);
            const entry = {
              sourceId: candidate.sourceId,
              title: candidate.title,
              trackId: outcome.trackId,
              reason: outcome.reason,
            };
            if (outcome.status === "accepted") report.accepted.push(entry);
            else if (outcome.status === "skipped") report.skipped.push(entry);
            else if (outcome.status === "rejected") report.rejected.push(entry);
            else report.failed.push(entry);
          } catch (error) {
            report.failed.push({
              sourceId: candidate.sourceId,
              title: candidate.title,
              reason: error instanceof Error ? error.message : "ingest_failed",
            });
          }
        }
        if (!result.next) break;
        page += 1;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    report.status = report.accepted.length >= limit ? "completed" : "partial";
  } finally {
    await database.close();
    writeReport();
  }

  console.log(`Catalog ingest ${report.status}.`);
  console.log(`Accepted ${report.accepted.length}, skipped ${report.skipped.length}, rejected ${report.rejected.length}, failed ${report.failed.length}.`);
  console.log(`Report written to ${reportPath}.`);
}

main().catch(error => {
  report.status = "failed";
  report.reason = error instanceof Error ? error.message : "unknown_error";
  writeReport();
  console.error("Catalog ingest failed:", report.reason);
  process.exitCode = 1;
});

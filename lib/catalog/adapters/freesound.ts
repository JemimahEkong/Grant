import type { CatalogCandidate } from "../types";

export type FreesoundSound = {
  id: number;
  name: string;
  username: string;
  license: string;
  duration: number;
  description?: string | null;
  tags?: string[];
  previews?: Record<string, string | undefined>;
};

export type FreesoundSearchResult = {
  candidates: CatalogCandidate[];
  next: string | null;
  count: number;
};

export class FreesoundApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiMessage: string | null,
  ) {
    super(`Freesound rejected the request with HTTP ${status}.`);
    this.name = "FreesoundApiError";
  }
}

const fields = "id,name,username,license,duration,description,tags,previews";

export function normalizeFreesoundSound(sound: FreesoundSound): CatalogCandidate | null {
  const audioUrl = sound.previews?.["preview-hq-mp3"] ?? sound.previews?.["preview-lq-mp3"];
  if (!audioUrl || !sound.id || !sound.name || !sound.username) return null;
  return {
    source: "freesound",
    sourceId: String(sound.id),
    title: sound.name,
    author: sound.username,
    sourceUrl: `https://freesound.org/people/${encodeURIComponent(sound.username)}/sounds/${sound.id}/`,
    licenseRaw: sound.license,
    durationSeconds: Number(sound.duration),
    audioUrl,
    tags: sound.tags ?? [],
    description: sound.description ?? null,
  };
}

export async function searchFreesound(input: {
  apiKey: string;
  query: string;
  page?: number;
  pageSize?: number;
}): Promise<FreesoundSearchResult> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 50;
  const url = new URL("https://freesound.org/apiv2/search/text/");
  url.searchParams.set("query", input.query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("fields", fields);
  url.searchParams.set("token", input.apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    let apiMessage: string | null = null;
    try {
      const body = (await response.json()) as { detail?: unknown; error?: unknown; message?: unknown };
      const raw = body.detail ?? body.error ?? body.message;
      if (typeof raw === "string") apiMessage = raw;
      else if (raw) apiMessage = JSON.stringify(raw);
    } catch {
      apiMessage = null;
    }
    throw new FreesoundApiError(response.status, apiMessage);
  }
  const body = (await response.json()) as {
    count?: number;
    next?: string | null;
    results?: FreesoundSound[];
  };
  const candidates = (body.results ?? [])
    .map(normalizeFreesoundSound)
    .filter((candidate): candidate is CatalogCandidate => candidate !== null);
  return {
    candidates,
    next: body.next ?? null,
    count: body.count ?? candidates.length,
  };
}

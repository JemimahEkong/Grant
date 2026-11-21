import type { TrackLicenseCode } from "../licensing/types";
import type { CatalogLicenseFacts, CatalogMetadataDraft } from "./types";

const CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/";
const BY4_URL = "https://creativecommons.org/licenses/by/4.0/";
const BY3_URL = "https://creativecommons.org/licenses/by/3.0/";

export function mapFreesoundLicense(license: string | null | undefined): TrackLicenseCode | null {
  const value = license?.trim().toLowerCase() ?? "";
  if (!value) return null;
  if (
    value.includes("/by-nc") ||
    value.includes("/by-nd") ||
    value.includes("/by-sa") ||
    value.includes("noncommercial") ||
    value.includes("noderiv") ||
    value.includes("sharealike") ||
    value.includes("sampling")
  ) {
    return null;
  }
  if (
    value.includes("publicdomain/zero") ||
    value.includes("creative commons 0") ||
    value === "cc0"
  ) {
    return "cc0";
  }
  if (value.includes("licenses/by/4.0") || value.includes("attribution 4.0")) return "cc-by-4.0";
  if (value.includes("licenses/by/3.0") || value.includes("attribution 3.0")) return "cc-by-3.0";
  return null;
}

export function licenseFactsFor(
  licenseCode: TrackLicenseCode,
  input: { title: string; author: string; sourceUrl: string },
): CatalogLicenseFacts {
  if (licenseCode === "cc0") {
    return {
      licenseCode,
      licenseUrl: CC0_URL,
      attributionRequired: false,
      attributionText: "CC0 · public domain",
      commercialUse: true,
      derivatives: true,
      standaloneRedistribution: true,
      previewAllowed: true,
    };
  }
  if (licenseCode === "cc-by-4.0" || licenseCode === "cc-by-3.0") {
    const label = licenseCode === "cc-by-4.0" ? "CC BY 4.0" : "CC BY 3.0";
    return {
      licenseCode,
      licenseUrl: licenseCode === "cc-by-4.0" ? BY4_URL : BY3_URL,
      attributionRequired: true,
      attributionText: `"${input.title}" by ${input.author}, licensed ${label}, ${input.sourceUrl}`,
      commercialUse: true,
      derivatives: true,
      standaloneRedistribution: true,
      previewAllowed: true,
    };
  }
  if (licenseCode === "pixabay") {
    return {
      licenseCode,
      licenseUrl: "https://pixabay.com/service/license-summary/",
      attributionRequired: false,
      attributionText: "Pixabay Content License",
      commercialUse: true,
      derivatives: true,
      standaloneRedistribution: false,
      previewAllowed: true,
    };
  }
  return {
    licenseCode,
    licenseUrl: null,
    attributionRequired: false,
    attributionText: "Grant commercial license",
    commercialUse: true,
    derivatives: true,
    standaloneRedistribution: false,
    previewAllowed: true,
  };
}

export function isDurationAllowed(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds >= 15 && seconds <= 480;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanTitle(title: string, author: string): string {
  let value = title.replace(/\s+/g, " ").trim();
  const authorName = author.trim();
  if (authorName) {
    value = value.replace(new RegExp(`\\s+by\\s+${escapeRegExp(authorName)}\\s*$`, "i"), "").trim();
  }
  if (value.length > 60) {
    const sliced = value.slice(0, 60);
    const lastSpace = sliced.lastIndexOf(" ");
    value = (lastSpace >= 20 ? sliced.slice(0, lastSpace) : sliced).trim();
  }
  return value || "Untitled";
}

const forbiddenMusicTerms = /\b(textures?|soundscapes?|field[- ]recordings?|foley|drones?|sample[- ]packs?|sfx|sound[- ]effects?|sound[- ]design|vocals?|vocal[- ]samples?|voices?|singing|acapellas?|a cappella)\b/i;

export function isMusicCandidate(input: { title: string; tags: string[]; description?: string | null }): { ok: true } | { ok: false; reason: string } {
  const text = `${input.title} ${input.tags.join(" ")} ${input.description ?? ""}`;
  const forbidden = text.match(forbiddenMusicTerms);
  if (forbidden) return { ok: false, reason: `forbidden_term:${forbidden[1].toLowerCase()}` };
  const hasMusicTag = input.tags.some(tag => /(^|[\s_-])music($|[\s_-])/i.test(tag));
  if (!hasMusicTag) return { ok: false, reason: "missing_music_tag" };
  return { ok: true };
}

const genres = ["acoustic", "ambient", "cinematic", "electronic"] as const;
const moodRules: Array<{ mood: string; matches: RegExp }> = [
  { mood: "warm", matches: /warm|soft|mellow|cozy|gentle/i },
  { mood: "tense", matches: /tense|dark|suspense|dramatic|horror/i },
  { mood: "uplifting", matches: /uplift|happy|bright|hopeful|joy/i },
  { mood: "minimal", matches: /minimal|sparse|simple|beatless|ambient/i },
  { mood: "driving", matches: /driv|energ|upbeat|fast|dance|pulse/i },
  { mood: "playful", matches: /playful|fun|quirky|cute|toy/i },
  { mood: "cinematic", matches: /cinematic|epic|film|soundtrack|score|orchestr/i },
  { mood: "gritty", matches: /gritty|dirty|distort|industrial|grunge/i },
];

function chooseGenre(text: string): string {
  if (/acoustic|guitar|piano|folk|strings/i.test(text)) return "acoustic";
  if (/ambient|pad|drone|calm|atmos/i.test(text)) return "ambient";
  if (/cinematic|orchestr|film|soundtrack|trailer/i.test(text)) return "cinematic";
  return "electronic";
}

function chooseMoods(text: string, genre: string): string[] {
  const found = moodRules.filter(rule => rule.matches.test(text)).map(rule => rule.mood);
  const defaults: Record<string, string[]> = {
    acoustic: ["warm", "minimal"],
    ambient: ["cinematic", "minimal"],
    cinematic: ["cinematic", "tense"],
    electronic: ["driving", "gritty"],
  };
  const result = [...new Set([...found, ...(defaults[genre] ?? ["minimal", "cinematic"])])].slice(0, 3);
  return result.length >= 2 ? result : [...result, "minimal"].slice(0, 2);
}

export function draftMetadata(input: { title: string; tags: string[]; description?: string | null }): CatalogMetadataDraft {
  const text = `${input.title} ${input.tags.join(" ")} ${input.description ?? ""}`;
  const genre = chooseGenre(text);
  const moods = chooseMoods(text, genre);
  const energy = /high|energ|driv|intense|fast|power/i.test(text)
    ? 4
    : /calm|soft|quiet|slow|gentle|ambient/i.test(text)
      ? 2
      : 3;
  const instrumental = !/vocal|voice|sing|lyric|choir/i.test(text);
  return { genre: genres.includes(genre as (typeof genres)[number]) ? genre : "electronic", moods, energy, instrumental };
}

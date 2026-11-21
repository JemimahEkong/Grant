import type { Brief, Platform } from "../licensing/schema";
import type { CatalogItem } from "../ui/api";

export type DiscoveryUse = "all" | "organic" | "paid_ad";
export type DiscoverySort = "relevance" | "price" | "duration";
export type DiscoveryTerritory = "all" | "worldwide" | "us" | "uk";

export type DiscoveryFilters = {
  search: string;
  use: DiscoveryUse;
  platform: Platform | "all";
  termDays: 0 | 90 | 180 | 365;
  minClipSeconds: 0 | 15 | 30 | 60;
  mood: string | "all";
  energy: 0 | 1 | 2 | 3 | 4 | 5;
  territory: DiscoveryTerritory;
};

export const emptyFilters: DiscoveryFilters = {
  search: "",
  use: "all",
  platform: "all",
  termDays: 0,
  minClipSeconds: 0,
  mood: "all",
  energy: 0,
  territory: "all",
};

const platforms: Platform[] = ["instagram", "tiktok", "youtube", "facebook"];

export function platformLabel(platform: Platform): string {
  if (platform === "instagram") return "Instagram";
  if (platform === "tiktok") return "TikTok";
  if (platform === "youtube") return "YouTube";
  return "Facebook";
}

export function filtersFromBrief(brief: Brief): DiscoveryFilters {
  return {
    ...emptyFilters,
    use: brief.intendedUse === "paid_ad" ? "paid_ad" : "organic",
    platform: brief.platforms.length === 1 ? brief.platforms[0] : "all",
    termDays: brief.termDays <= 90 ? 90 : brief.termDays <= 180 ? 180 : brief.termDays <= 365 ? 365 : 0,
    minClipSeconds: brief.clipDurationSeconds <= 15 ? 15 : brief.clipDurationSeconds <= 30 ? 30 : 60,
    territory: brief.territory.worldwide
      ? "worldwide"
      : brief.territory.countries.includes("us")
        ? "us"
        : brief.territory.countries.includes("uk")
          ? "uk"
          : "all",
  };
}

function haystack(item: CatalogItem): string {
  return [item.title, item.sourceAuthor, item.sellerName, item.genre, ...item.moods]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterCatalog(items: CatalogItem[], filters: DiscoveryFilters): CatalogItem[] {
  const needle = filters.search.trim().toLowerCase();
  return items.filter(item => {
    if (needle && !haystack(item).includes(needle)) return false;

    if (filters.use !== "all") {
      const platformsForUse = item.platformsByUse[filters.use] ?? [];
      if (platformsForUse.length === 0) return false;
      if (filters.platform !== "all" && !platformsForUse.includes(filters.platform)) return false;
    } else if (filters.platform !== "all") {
      const all = [...(item.platformsByUse.organic ?? []), ...(item.platformsByUse.paid_ad ?? [])];
      if (!all.includes(filters.platform)) return false;
    }

    if (filters.termDays > 0 && item.maximumTermDays < filters.termDays) return false;
    if (filters.minClipSeconds > 0 && item.maximumClipSeconds < filters.minClipSeconds) return false;
    if (filters.mood !== "all" && !item.moods.includes(filters.mood)) return false;
    if (filters.energy > 0 && (item.energy ?? 0) < filters.energy) return false;

    if (filters.territory !== "all") {
      const covers =
        item.territory.worldwide ||
        (filters.territory !== "worldwide" && item.territory.countries.includes(filters.territory));
      if (!covers) return false;
      if (filters.territory === "worldwide" && !item.territory.worldwide) return false;
    }

    return true;
  });
}

function compareBaseUnits(a: CatalogItem, b: CatalogItem): number {
  const left = BigInt(a.amountBaseUnits);
  const right = BigInt(b.amountBaseUnits);
  return left < right ? -1 : left > right ? 1 : 0;
}

function relevance(item: CatalogItem, search: string): number {
  const needle = search.trim().toLowerCase();
  if (!needle) return 0;
  const title = item.title.toLowerCase();
  let score = 0;
  if (title === needle) score += 10;
  if (title.startsWith(needle)) score += 5;
  if (title.includes(needle)) score += 3;
  if ((item.sourceAuthor ?? "").toLowerCase().includes(needle)) score += 2;
  if ((item.genre ?? "").toLowerCase().includes(needle)) score += 1;
  if (item.moods.some(mood => mood.toLowerCase().includes(needle))) score += 1;
  return score;
}

export function sortCatalog(items: CatalogItem[], sort: DiscoverySort, search: string): CatalogItem[] {
  const sorted = [...items];
  if (sort === "price") {
    sorted.sort((a, b) => compareBaseUnits(a, b) || a.durationSeconds - b.durationSeconds);
    return sorted;
  }
  if (sort === "duration") {
    sorted.sort((a, b) => a.durationSeconds - b.durationSeconds || compareBaseUnits(a, b));
    return sorted;
  }
  sorted.sort((a, b) => relevance(b, search) - relevance(a, search) || compareBaseUnits(a, b));
  return sorted;
}

export function filtersFromParams(params: URLSearchParams, brief?: Brief | null): DiscoveryFilters {
  const defaults = brief ? filtersFromBrief(brief) : emptyFilters;

  const useParam = params.get("use");
  const use: DiscoveryUse = useParam === "all" || useParam === "organic" || useParam === "paid_ad" ? useParam : defaults.use;

  const platformParam = params.get("platform");
  const platform: Platform | "all" =
    platformParam === "all"
      ? "all"
      : platforms.includes(platformParam as Platform)
        ? (platformParam as Platform)
        : defaults.platform;

  const term = params.get("term");
  const termNumber = term === null ? null : Number(term);
  const termDays: DiscoveryFilters["termDays"] =
    termNumber === 0 || termNumber === 90 || termNumber === 180 || termNumber === 365
      ? termNumber
      : defaults.termDays;

  const clip = params.get("clip");
  const clipNumber = clip === null ? null : Number(clip);
  const minClipSeconds: DiscoveryFilters["minClipSeconds"] =
    clipNumber === 0 || clipNumber === 15 || clipNumber === 30 || clipNumber === 60
      ? clipNumber
      : defaults.minClipSeconds;

  const energy = params.get("energy");
  const energyNumber = energy === null ? null : Number(energy);
  const energyValue: DiscoveryFilters["energy"] =
    energyNumber === 0 || energyNumber === 1 || energyNumber === 2 || energyNumber === 3 || energyNumber === 4 || energyNumber === 5
      ? energyNumber
      : defaults.energy;

  const territory = params.get("territory");
  const territoryValue: DiscoveryTerritory =
    territory === "all" || territory === "worldwide" || territory === "us" || territory === "uk"
      ? territory
      : defaults.territory;

  return {
    search: params.get("q") ?? defaults.search,
    use,
    platform,
    termDays,
    minClipSeconds,
    mood: params.get("mood") ?? defaults.mood,
    energy: energyValue,
    territory: territoryValue,
  };
}

export function sortFromParam(value: string | null): DiscoverySort {
  return value === "price" || value === "duration" ? value : "relevance";
}

export function pageFromParam(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function discoverCatalog(
  items: CatalogItem[],
  filters: DiscoveryFilters,
  sort: DiscoverySort,
): CatalogItem[] {
  return sortCatalog(filterCatalog(items, filters), sort, filters.search);
}

export function moodOptions(items: CatalogItem[]): string[] {
  return Array.from(new Set(items.flatMap(item => item.moods))).sort((a, b) => a.localeCompare(b));
}

export function availablePlatforms(): Platform[] {
  return platforms;
}

export function filtersAreDefaulted(filters: DiscoveryFilters, brief: Brief): boolean {
  const defaulted = filtersFromBrief(brief);
  return (Object.keys(defaulted) as Array<keyof DiscoveryFilters>).every(key => defaulted[key] === filters[key]);
}

export function activeFilterCount(filters: DiscoveryFilters): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.use !== "all") count += 1;
  if (filters.platform !== "all") count += 1;
  if (filters.termDays > 0) count += 1;
  if (filters.minClipSeconds > 0) count += 1;
  if (filters.mood !== "all") count += 1;
  if (filters.energy > 0) count += 1;
  if (filters.territory !== "all") count += 1;
  return count;
}

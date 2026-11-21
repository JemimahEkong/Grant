import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  discoverCatalog,
  emptyFilters,
  filtersFromBrief,
  moodOptions,
  sortCatalog,
  type DiscoveryFilters,
} from "../lib/catalog/discovery";
import type { CatalogItem } from "../lib/ui/api";
import type { Brief } from "../lib/licensing/schema";

const brief: Brief = {
  intendedUse: "organic",
  platforms: ["instagram"],
  territory: { worldwide: false, countries: ["us"] },
  termDays: 90,
  clipDurationSeconds: 30,
  clientDelivery: false,
  reposting: false,
  futureCampaigns: false,
};

function item(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    offerId: "offer-1",
    fixtureOfferId: "offer-1",
    offerVersion: 1,
    trackId: "track-1",
    title: "Morning Edit",
    sellerId: "grant-catalog",
    sellerName: "Grant Catalog",
    durationSeconds: 60,
    bpm: 120,
    source: "freesound",
    sourceUrl: "https://freesound.org/s/1",
    sourceId: "1",
    sourceAuthor: "Ava",
    licenseCode: "cc0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attributionRequired: false,
    attributionText: null,
    commercialUse: true,
    derivatives: true,
    standaloneRedistribution: false,
    previewAllowed: true,
    genre: "ambient",
    moods: ["warm", "cinematic"],
    energy: 3,
    instrumental: true,
    key: null,
    previewKey: "previews/1.mp3",
    sourceLabel: null,
    provenanceReference: null,
    amountBaseUnits: "10000000",
    platformsByUse: {
      organic: ["instagram", "tiktok"],
      paid_ad: ["instagram"],
    },
    territory: { worldwide: true, countries: [] },
    maximumTermDays: 90,
    maximumClipSeconds: 60,
    clientDelivery: false,
    reposting: false,
    futureCampaigns: false,
    payeeConfigured: true,
    ...overrides,
  };
}

const filters = (overrides: Partial<DiscoveryFilters> = {}): DiscoveryFilters => ({
  ...emptyFilters,
  ...overrides,
});

describe("catalog discovery", () => {
  it("searches title, artist, genre, and mood", () => {
    const items = [item(), item({ offerId: "o2", trackId: "t2", title: "Night Drive", sourceAuthor: "Noah", genre: "synthwave", moods: ["tense"] })];
    expect(discoverCatalog(items, filters({ search: "morning" }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
    expect(discoverCatalog(items, filters({ search: "noah" }), "relevance").map(i => i.trackId)).toEqual(["t2"]);
    expect(discoverCatalog(items, filters({ search: "synthwave" }), "relevance").map(i => i.trackId)).toEqual(["t2"]);
    expect(discoverCatalog(items, filters({ search: "tense" }), "relevance").map(i => i.trackId)).toEqual(["t2"]);
  });

  it("filters by use and platform", () => {
    const organicOnly = item({ offerId: "o2", trackId: "t2", platformsByUse: { organic: ["youtube"] } });
    const items = [item(), organicOnly];
    expect(discoverCatalog(items, filters({ use: "paid_ad" }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
    expect(discoverCatalog(items, filters({ use: "organic", platform: "youtube" }), "relevance").map(i => i.trackId)).toEqual(["t2"]);
    expect(discoverCatalog(items, filters({ platform: "tiktok" }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
  });

  it("filters by covered term, clip length, mood, and energy", () => {
    const short = item({ offerId: "o2", trackId: "t2", maximumTermDays: 30, maximumClipSeconds: 15, energy: 1, moods: ["gritty"] });
    const items = [item(), short];
    expect(discoverCatalog(items, filters({ termDays: 90 }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
    expect(discoverCatalog(items, filters({ minClipSeconds: 30 }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
    expect(discoverCatalog(items, filters({ mood: "gritty" }), "relevance").map(i => i.trackId)).toEqual(["t2"]);
    expect(discoverCatalog(items, filters({ energy: 3 }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
  });

  it("keeps worldwide offers for a country filter and hides limited offers from worldwide", () => {
    const limited = item({
      offerId: "o2",
      trackId: "t2",
      territory: { worldwide: false, countries: ["us"] },
    });
    const items = [item(), limited];
    expect(discoverCatalog(items, filters({ territory: "us" }), "relevance").map(i => i.trackId)).toEqual(["track-1", "t2"]);
    expect(discoverCatalog(items, filters({ territory: "worldwide" }), "relevance").map(i => i.trackId)).toEqual(["track-1"]);
  });

  it("sorts by price, duration, and relevance", () => {
    const expensive = item({ offerId: "o2", trackId: "t2", title: "Morning Edit Deluxe", amountBaseUnits: "20000000", durationSeconds: 30 });
    const items = [expensive, item()];
    expect(sortCatalog(items, "price", "").map(i => i.trackId)).toEqual(["track-1", "t2"]);
    expect(sortCatalog(items, "duration", "").map(i => i.trackId)).toEqual(["t2", "track-1"]);
    expect(sortCatalog(items, "relevance", "deluxe").map(i => i.trackId)).toEqual(["t2", "track-1"]);
  });

  it("derives brief defaults and counts active filters", () => {
    expect(filtersFromBrief(brief)).toMatchObject({
      use: "organic",
      platform: "instagram",
      termDays: 90,
      minClipSeconds: 30,
      territory: "us",
    });
    expect(activeFilterCount(filtersFromBrief(brief))).toBe(5);
    expect(activeFilterCount(emptyFilters)).toBe(0);
  });

  it("lists unique moods in order", () => {
    expect(moodOptions([item(), item({ moods: ["cinematic", "gritty"] })])).toEqual(["cinematic", "gritty", "warm"]);
  });
});

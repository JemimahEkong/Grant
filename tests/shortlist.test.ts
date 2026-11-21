import { describe, expect, it } from "vitest";
import type { Brief } from "../lib/licensing/schema";
import { rankShortlist } from "../lib/catalog/shortlist";
import type { CatalogItem } from "../lib/ui/api";

const brief: Brief = {
  intendedUse: "organic",
  platforms: ["instagram", "tiktok"],
  territory: { worldwide: true, countries: [] },
  termDays: 90,
  clipDurationSeconds: 20,
  clientDelivery: true,
  reposting: false,
  futureCampaigns: false,
};

function item(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    offerId: "offer-1",
    offerVersion: 1,
    trackId: "track-1",
    title: "Warm Loop",
    sellerId: "grant-catalog",
    sellerName: "Grant Catalog",
    durationSeconds: 30,
    bpm: null,
    sourceAuthor: "Ava",
    authority: { composition: true, master: true },
    createdAt: "2026-11-18T00:00:00.000Z",
    licenseCode: "cc0",
    attributionText: "CC0 · public domain",
    sourceUrl: "https://freesound.org/s/1",
    genre: "ambient",
    moods: ["warm"],
    energy: 3,
    amountBaseUnits: "10000000",
    platformsByUse: { organic: ["instagram", "tiktok"], paid_ad: ["instagram", "tiktok"] },
    territory: { worldwide: true, countries: [] },
    maximumTermDays: 90,
    maximumClipSeconds: 60,
    clientDelivery: true,
    reposting: false,
    futureCampaigns: false,
    payeeConfigured: true,
    ...overrides,
  };
}

describe("shortlist ranking", () => {
  it("returns eight entries and the full matching count", () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      item({
        offerId: `offer-${index}`,
        trackId: `track-${index}`,
        title: `Track ${index}`,
        durationSeconds: 20 + index,
        createdAt: `2026-11-${String(18 + index).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    const result = rankShortlist(items, brief, 50_000_000n);
    expect(result.matchingCount).toBe(12);
    expect(result.entries).toHaveLength(8);
    expect(result.entries[0]?.item.durationSeconds).toBe(20);
    expect(result.entries.every(entry => entry.reason.length > 0)).toBe(true);
    expect(result.diagnosis).toBeNull();
  });

  it("hard-rejects tracks shorter than the clip", () => {
    const items = [
      item({ offerId: "short", trackId: "short", title: "Short", durationSeconds: 18 }),
      item({ offerId: "exact", trackId: "exact", title: "Exact", durationSeconds: 20 }),
      item({ offerId: "long", trackId: "long", title: "Long", durationSeconds: 40 }),
    ];
    const result = rankShortlist(items, brief, 50_000_000n);
    expect(result.entries.map(entry => entry.item.title)).toEqual(["Exact", "Long"]);
    expect(result.matchingCount).toBe(2);
  });

  it("uses paid-ad coverage and puts the paid-ad reason on every card", () => {
    const items = [
      item({ offerId: "paid", trackId: "paid", title: "Paid", platformsByUse: { organic: ["instagram", "tiktok"], paid_ad: ["instagram", "tiktok"] } }),
      item({ offerId: "organic", trackId: "organic", title: "Organic", platformsByUse: { organic: ["instagram", "tiktok"], paid_ad: [] } }),
    ];
    const result = rankShortlist(items, { ...brief, intendedUse: "paid_ad" }, 50_000_000n);
    expect(result.matchingCount).toBe(1);
    expect(result.entries[0]?.item.title).toBe("Paid");
    expect(result.entries[0]?.reason).toContain("covers paid ads on Instagram and TikTok");
  });

  it("explains an organic-only track in plain language", () => {
    const result = rankShortlist(
      [item({ title: "Organic", platformsByUse: { organic: ["instagram", "tiktok"], paid_ad: [] } })],
      brief,
      50_000_000n,
    );
    expect(result.entries[0]?.reason).toBe("organic only, at 1.00 USDC, fits your 90 days");
  });

  it("names the longest track when nothing reaches the clip", () => {
    const items = [
      item({ offerId: "a", trackId: "a", title: "A", durationSeconds: 18 }),
      item({ offerId: "b", trackId: "b", title: "B", durationSeconds: 19 }),
    ];
    const result = rankShortlist(items, brief, 50_000_000n);
    expect(result.entries).toHaveLength(0);
    expect(result.matchingCount).toBe(0);
    expect(result.diagnosis?.message).toContain("0:19 (19s)");
    expect(result.diagnosis?.message).toContain("0:20 (20s)");
    expect(result.diagnosis?.relaxation).toBe("Shorten the clip to 19 seconds or less.");
  });

  it("breaks score ties by newer catalogue age, then title", () => {
    const items = [
      item({ offerId: "old", trackId: "old", title: "Old", createdAt: "2026-11-18T00:00:00.000Z" }),
      item({ offerId: "new", trackId: "new", title: "New", createdAt: "2026-11-20T00:00:00.000Z" }),
    ];
    const result = rankShortlist(items, brief, 50_000_000n);
    expect(result.entries.map(entry => entry.item.title)).toEqual(["New", "Old"]);
  });

  it("uses mood and energy in the score and the longest-mood reason", () => {
    const items = [
      item({ offerId: "short", trackId: "short", title: "Short", durationSeconds: 22, moods: ["tense"], energy: 4 }),
      item({ offerId: "long", trackId: "long", title: "Long", durationSeconds: 80, moods: ["tense"], energy: 4 }),
    ];
    const result = rankShortlist(items, { ...brief, mood: "tense", energy: 4 }, 50_000_000n);
    expect(result.entries[0]?.item.title).toBe("Short");
    expect(result.entries.some(entry => entry.reason === "longest track in tense, leaves room to trim")).toBe(true);
  });

  it("calls an exact duration match what it is", () => {
    const result = rankShortlist([item({ durationSeconds: 20 })], brief, 50_000_000n);
    expect(result.entries[0]?.reason).toBe("exactly 20 seconds, your clip length");
  });

  it("uses the closest duration as a reason", () => {
    const items = [
      item({ offerId: "a", trackId: "a", title: "A", durationSeconds: 22 }),
      item({ offerId: "b", trackId: "b", title: "B", durationSeconds: 70 }),
    ];
    const result = rankShortlist(items, brief, 50_000_000n);
    expect(result.entries[0]?.reason).toBe("only 2s longer than your 20s clip");
  });

  it("ranks a track that fits the remaining budget above one that does not", () => {
    const items = [
      item({ offerId: "cheap", trackId: "cheap", title: "Cheap", durationSeconds: 20, amountBaseUnits: "10000000" }),
      item({ offerId: "pricey", trackId: "pricey", title: "Pricey", durationSeconds: 20, amountBaseUnits: "90000000" }),
    ];
    const result = rankShortlist(items, brief, 20_000_000n);
    expect(result.entries[0]?.item.title).toBe("Cheap");
  });
});

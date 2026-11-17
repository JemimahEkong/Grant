import { describe, expect, it } from "vitest";
import { demoOffers } from "../demo/catalog";
import { matchCatalog, matchOffer } from "../lib/licensing/match";
import { briefSchema, type Brief } from "../lib/licensing/schema";

const brief: Brief = {
  intendedUse: "organic", platforms: ["instagram", "tiktok"],
  territory: { worldwide: true, countries: [] }, termDays: 90,
  clipDurationSeconds: 30, clientDelivery: true, reposting: false, futureCampaigns: false,
};

describe("structured coverage", () => {
  it("matches only compatible demo offers", () => {
    expect(matchCatalog(brief, demoOffers).filter(result => result.compatible).map(result => result.offerId)).toEqual(["morning-edit-base", "quiet-cut-base"]);
  });

  it("does not infer paid advertising from organic platform coverage", () => {
    expect(matchOffer({ ...brief, intendedUse: "paid_ad" }, demoOffers[1]).reasons).toContainEqual(expect.objectContaining({ code: "USE_NOT_COVERED" }));
  });

  it("checks every requested platform", () => {
    expect(matchOffer({ ...brief, platforms: ["instagram", "youtube"] }, demoOffers[1]).reasons).toContainEqual(expect.objectContaining({ code: "PLATFORM_NOT_COVERED" }));
  });

  it("rejects unknown authority and reuse permissions", () => {
    const offer = { ...demoOffers[0], authority: { composition: null, master: true }, reposting: null, clientDelivery: null, futureCampaigns: null };
    expect(matchOffer({ ...brief, reposting: true, futureCampaigns: true }, offer).reasons.map(reason => reason.code)).toEqual(["AUTHORITY_UNKNOWN", "CLIENT_USE_NOT_COVERED", "REPOSTING_NOT_COVERED", "FUTURE_CAMPAIGNS_NOT_COVERED"]);
  });

  it("rejects excessive term and duration", () => {
    expect(matchOffer({ ...brief, termDays: 91, clipDurationSeconds: 61 }, demoOffers[0]).reasons.map(reason => reason.code)).toEqual(["TERM_NOT_COVERED", "DURATION_NOT_COVERED"]);
  });

  it("does not treat a country-specific offer as worldwide", () => {
    expect(matchOffer({ ...brief, platforms: ["youtube"], termDays: 30 }, demoOffers[2]).reasons).toContainEqual(expect.objectContaining({ code: "TERRITORY_NOT_COVERED" }));
  });

  it("accepts the permitted country and rejects countries outside it", () => {
    const localBrief = { ...brief, platforms: ["youtube"] as Brief["platforms"], termDays: 30, territory: { worldwide: false, countries: ["NG"] } };
    expect(matchOffer(localBrief, demoOffers[2]).compatible).toBe(true);
    expect(matchOffer({ ...localBrief, territory: { worldwide: false, countries: ["NG", "GB"] } }, demoOffers[2]).compatible).toBe(false);
  });
});

describe("brief validation", () => {
  it("accepts an explicitly confirmed brief", () => expect(briefSchema.safeParse(brief).success).toBe(true));
  it.each([undefined, null, "true"])("does not guess a missing/invalid permission: %s", value => {
    expect(briefSchema.safeParse({ ...brief, futureCampaigns: value }).success).toBe(false);
  });
  it("rejects duplicate platforms and inconsistent territories", () => {
    expect(briefSchema.safeParse({ ...brief, platforms: ["instagram", "instagram"] }).success).toBe(false);
    expect(briefSchema.safeParse({ ...brief, territory: { worldwide: true, countries: ["NG"] } }).success).toBe(false);
    expect(briefSchema.safeParse({ ...brief, territory: { worldwide: false, countries: [] } }).success).toBe(false);
  });
  it("rejects unknown country codes and unrecognized fields", () => {
    expect(briefSchema.safeParse({ ...brief, territory: { worldwide: false, countries: ["XX"] } }).success).toBe(false);
    expect(briefSchema.safeParse({ ...brief, approved: true }).success).toBe(false);
  });
});

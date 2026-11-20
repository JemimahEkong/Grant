import { describe, expect, it } from "vitest";
import { formatLicenseCredit } from "../lib/licensing/license-credit";
import {
  assertOfferWithinLicense,
  validateOfferAgainstLicense,
  type OfferLicenseTerms,
  type SourceLicenseFacts,
} from "../lib/licensing/offer-license";

const cc0: SourceLicenseFacts = {
  licenseCode: "cc0",
  commercialUse: true,
  derivatives: true,
  standaloneRedistribution: true,
  attributionRequired: false,
  attributionText: "CC0 · public domain",
};

const fullOffer: OfferLicenseTerms = {
  platformsPaidAd: ["instagram", "tiktok"],
  clientDelivery: true,
  reposting: true,
  futureCampaigns: false,
};

describe("license credit", () => {
  it("uses the public-domain label for CC0", () => {
    expect(formatLicenseCredit({ licenseCode: "cc0", attributionText: "ignored" })).toBe("CC0 · public domain");
  });

  it("shows the exact credit line for an attribution license", () => {
    const credit = '"Plains" by tyballer92, licensed CC BY 4.0, https://example.com/source';
    expect(formatLicenseCredit({ licenseCode: "cc-by-4.0", attributionRequired: true, attributionText: credit })).toBe(credit);
  });

  it("does not invent a credit when the record is missing", () => {
    expect(formatLicenseCredit({ licenseCode: "cc-by-4.0", attributionRequired: true, attributionText: null })).toBe(
      "License credit not recorded",
    );
  });
});

describe("offer subset of source license", () => {
  it("accepts a full CC0 offer", () => {
    expect(validateOfferAgainstLicense(cc0, fullOffer)).toEqual([]);
    expect(() => assertOfferWithinLicense(cc0, fullOffer)).not.toThrow();
  });

  it("rejects commercial use when the source forbids it", () => {
    const issues = validateOfferAgainstLicense({ ...cc0, commercialUse: false }, fullOffer);
    expect(issues.map(issue => issue.code)).toContain("COMMERCIAL_USE_NOT_ALLOWED");
  });

  it("rejects paid ads when derivatives are not allowed", () => {
    const issues = validateOfferAgainstLicense({ ...cc0, derivatives: false }, fullOffer);
    expect(issues.map(issue => issue.code)).toContain("DERIVATIVES_NOT_ALLOWED");
  });

  it("rejects client delivery without standalone redistribution", () => {
    const issues = validateOfferAgainstLicense(
      { ...cc0, standaloneRedistribution: false },
      { ...fullOffer, reposting: false },
    );
    expect(issues.map(issue => issue.code)).toContain("CLIENT_DELIVERY_NOT_ALLOWED");
  });

  it("rejects reposting without standalone redistribution", () => {
    const issues = validateOfferAgainstLicense(
      { ...cc0, standaloneRedistribution: false },
      { ...fullOffer, clientDelivery: false },
    );
    expect(issues.map(issue => issue.code)).toContain("STANDALONE_REDISTRIBUTION_NOT_ALLOWED");
  });

  it("rejects an attribution license with no credit line", () => {
    const issues = validateOfferAgainstLicense(
      { ...cc0, licenseCode: "cc-by-4.0", attributionRequired: true, attributionText: "" },
      fullOffer,
    );
    expect(issues.map(issue => issue.code)).toContain("ATTRIBUTION_TEXT_REQUIRED");
  });

  it("throws a clear error for a deliberately invalid offer", () => {
    expect(() =>
      assertOfferWithinLicense(
        { ...cc0, commercialUse: false, derivatives: false, standaloneRedistribution: false },
        { ...fullOffer, platformsPaidAd: ["tiktok"] },
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "OFFER_EXCEEDS_LICENSE",
        status: 422,
        details: expect.objectContaining({ issues: expect.any(Array) }),
      }),
    );
  });
});

import { RepositoryError } from "../db/errors";
import type { TrackLicenseCode } from "./types";

export type SourceLicenseFacts = {
  licenseCode: TrackLicenseCode;
  commercialUse: boolean;
  derivatives: boolean;
  standaloneRedistribution: boolean;
  attributionRequired: boolean;
  attributionText: string | null;
};

export type OfferLicenseTerms = {
  platformsPaidAd: readonly string[];
  clientDelivery: boolean | null;
  reposting: boolean | null;
  futureCampaigns: boolean | null;
};

export type LicenseValidationIssue = {
  code:
    | "COMMERCIAL_USE_NOT_ALLOWED"
    | "DERIVATIVES_NOT_ALLOWED"
    | "CLIENT_DELIVERY_NOT_ALLOWED"
    | "STANDALONE_REDISTRIBUTION_NOT_ALLOWED"
    | "ATTRIBUTION_TEXT_REQUIRED";
  message: string;
};

export function validateOfferAgainstLicense(
  license: SourceLicenseFacts,
  offer: OfferLicenseTerms,
): LicenseValidationIssue[] {
  const issues: LicenseValidationIssue[] = [];
  if (!license.commercialUse) {
    issues.push({
      code: "COMMERCIAL_USE_NOT_ALLOWED",
      message: "This source license does not permit commercial use.",
    });
  }
  if (offer.platformsPaidAd.length > 0 && !license.derivatives) {
    issues.push({
      code: "DERIVATIVES_NOT_ALLOWED",
      message: "Paid-ad use needs edit and derivative permission from the source license.",
    });
  }
  if (offer.clientDelivery === true && !license.standaloneRedistribution) {
    issues.push({
      code: "CLIENT_DELIVERY_NOT_ALLOWED",
      message: "Delivering the track file to a client exceeds this source license.",
    });
  }
  if (offer.reposting === true && !license.standaloneRedistribution) {
    issues.push({
      code: "STANDALONE_REDISTRIBUTION_NOT_ALLOWED",
      message: "Reposting the track as standalone content exceeds this source license.",
    });
  }
  if (license.attributionRequired && !license.attributionText?.trim()) {
    issues.push({
      code: "ATTRIBUTION_TEXT_REQUIRED",
      message: "This source license requires an exact attribution line.",
    });
  }
  return issues;
}

export function assertOfferWithinLicense(
  license: SourceLicenseFacts,
  offer: OfferLicenseTerms,
): void {
  const issues = validateOfferAgainstLicense(license, offer);
  if (issues.length === 0) return;
  throw new RepositoryError(
    "OFFER_EXCEEDS_LICENSE",
    `This offer exceeds its source license. ${issues.map(issue => issue.message).join(" ")}`,
    422,
    { issues },
  );
}

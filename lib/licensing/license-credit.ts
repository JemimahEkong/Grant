import type { TrackLicenseCode } from "./types";

export type LicenseCreditInput = {
  licenseCode: TrackLicenseCode | string | null;
  attributionRequired?: boolean | null;
  attributionText?: string | null;
};

export function formatLicenseCredit(input: LicenseCreditInput): string {
  if (input.licenseCode === "cc0") return "CC0 · public domain";
  const attribution = input.attributionText?.trim();
  if (attribution) return attribution;
  return "License credit not recorded";
}

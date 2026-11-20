import type { TrackLicenseCode, TrackSource } from "../licensing/types";

export type CatalogCandidate = {
  source: TrackSource;
  sourceId: string;
  title: string;
  author: string;
  sourceUrl: string;
  licenseRaw: string;
  durationSeconds: number;
  audioUrl: string;
  tags: string[];
  description: string | null;
};

export type CatalogLicenseFacts = {
  licenseCode: TrackLicenseCode;
  licenseUrl: string | null;
  attributionRequired: boolean;
  attributionText: string;
  commercialUse: boolean;
  derivatives: boolean;
  standaloneRedistribution: boolean;
  previewAllowed: boolean;
};

export type CatalogMetadataDraft = {
  genre: string;
  moods: string[];
  energy: number;
  instrumental: boolean;
};

import type { Offer } from "../lib/licensing/schema";

export const stellarTestnetUsdc = {
  network: "stellar:testnet",
  assetContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  assetDecimals: 7,
} as const;

export type DemoTrack = {
  id: string;
  title: string;
  sellerId: string;
  durationSeconds: number;
  audioObjectKey: string | null;
  authorityComposition: boolean | null;
  authorityMaster: boolean | null;
  provenanceReference: string | null;
  isFixture: boolean;
};

export const demoTracks: readonly DemoTrack[] = [
  {
    id: "morning-edit", title: "Morning Edit", sellerId: "seller-demo-morning", durationSeconds: 60,
    audioObjectKey: null, authorityComposition: true, authorityMaster: true,
    provenanceReference: "Demo seller self-assertion only. No composition or master evidence supplied.", isFixture: true,
  },
  {
    id: "quiet-cut", title: "Quiet Cut", sellerId: "seller-demo-quiet", durationSeconds: 60,
    audioObjectKey: null, authorityComposition: true, authorityMaster: true,
    provenanceReference: "Demo seller self-assertion only. No composition or master evidence supplied.", isFixture: true,
  },
  {
    id: "studio-pulse", title: "Studio Pulse", sellerId: "seller-demo-studio", durationSeconds: 30,
    audioObjectKey: null, authorityComposition: true, authorityMaster: true,
    provenanceReference: "Demo seller self-assertion only. No composition or master evidence supplied.", isFixture: true,
  },
];

export const demoOffers: readonly Offer[] = [
  {
    id: "morning-edit-base", version: 1, trackId: "morning-edit", sellerId: "seller-demo-morning", title: "Morning Edit", mode: "fixture", kind: "base",
    parentOfferId: null, parentOfferVersion: null,
    authority: { composition: true, master: true },
    platformsByUse: { organic: ["instagram", "facebook", "tiktok", "youtube"], paid_ad: ["instagram", "facebook", "tiktok", "youtube"] },
    territory: { worldwide: true, countries: [] }, maximumTermDays: 90, maximumClipSeconds: 60,
    clientDelivery: true, reposting: true, futureCampaigns: false, amountBaseUnits: "10000000",
    ...stellarTestnetUsdc, payeeAddress: null, active: true, expiresAt: null,
  },
  {
    id: "quiet-cut-base", version: 1, trackId: "quiet-cut", sellerId: "seller-demo-quiet", title: "Quiet Cut", mode: "fixture", kind: "base",
    parentOfferId: null, parentOfferVersion: null,
    authority: { composition: true, master: true },
    platformsByUse: { organic: ["instagram", "tiktok"] },
    territory: { worldwide: true, countries: [] }, maximumTermDays: 90, maximumClipSeconds: 60,
    clientDelivery: true, reposting: false, futureCampaigns: false, amountBaseUnits: "10000000",
    ...stellarTestnetUsdc, payeeAddress: null, active: true, expiresAt: null,
  },
  {
    id: "studio-pulse-base", version: 1, trackId: "studio-pulse", sellerId: "seller-demo-studio", title: "Studio Pulse", mode: "fixture", kind: "base",
    parentOfferId: null, parentOfferVersion: null,
    authority: { composition: true, master: true },
    platformsByUse: { organic: ["youtube"] },
    territory: { worldwide: false, countries: ["NG"] }, maximumTermDays: 30, maximumClipSeconds: 30,
    clientDelivery: true, reposting: false, futureCampaigns: false, amountBaseUnits: "10000000",
    ...stellarTestnetUsdc, payeeAddress: null, active: true, expiresAt: null,
  },
];

export const demoDisclosure = "Illustrative offer metadata only. Audio and authority evidence have not been supplied. These matches do not grant a license or authorize payment.";

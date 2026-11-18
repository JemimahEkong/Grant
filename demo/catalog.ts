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
  sellerName: string;
  durationSeconds: number;
  bpm: number | null;
  sourceLabel: string;
  audioObjectKey: string | null;
  authorityComposition: boolean | null;
  authorityMaster: boolean | null;
  provenanceReference: string | null;
  isFixture: boolean;
};

export const demoTracks: readonly DemoTrack[] = [
  {
    id: "morning-edit", title: "Morning Edit", sellerId: "seller-demo-morning", sellerName: "Halcyon Fields", durationSeconds: 60, bpm: 129,
    audioObjectKey: null, authorityComposition: true, authorityMaster: true,
    provenanceReference: "CC0 1.0 demo audio: \"Acoustic Guitar and Keys - Plains Soundtrack\" by tyballer92, Freesound 449812, https://freesound.org/people/tyballer92/sounds/449812. Retrieved 2026-11-18. Seller identity and offer terms are fixtures, not verified rights holders.",
    sourceLabel: "CC0 audio · Freesound · tyballer92",
    isFixture: true,
  },
  {
    id: "quiet-cut", title: "Quiet Cut", sellerId: "seller-demo-quiet", sellerName: "Northline Audio", durationSeconds: 48, bpm: null,
    audioObjectKey: null, authorityComposition: true, authorityMaster: true,
    provenanceReference: "CC0 1.0 demo audio: \"Long Ambient Pad\" by indigo.cloud, Freesound 254856, https://freesound.org/people/indigo.cloud/sounds/254856. Retrieved 2026-11-18. Beatless ambient recording. Seller identity and offer terms are fixtures, not verified rights holders.",
    sourceLabel: "CC0 audio · Freesound · indigo.cloud",
    isFixture: true,
  },
  {
    id: "studio-pulse", title: "Studio Pulse", sellerId: "seller-demo-studio", sellerName: "Kite & Co.", durationSeconds: 173, bpm: 117,
    audioObjectKey: null, authorityComposition: true, authorityMaster: true,
    provenanceReference: "CC0 1.0 demo audio: \"Cinematic Lofi Beat\" by Seth_Makes_Sounds, Freesound 687006, https://freesound.org/people/Seth_Makes_Sounds/sounds/687006. Retrieved 2026-11-18. Seller identity and offer terms are fixtures, not verified rights holders.",
    sourceLabel: "CC0 audio · Freesound · Seth_Makes_Sounds",
    isFixture: true,
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
  {
    id: "morning-edit-addon", version: 1, trackId: "morning-edit", sellerId: "seller-demo-morning", title: "Morning Edit · Paid ads", mode: "fixture", kind: "addon",
    parentOfferId: "morning-edit-base", parentOfferVersion: 1,
    authority: { composition: true, master: true },
    platformsByUse: { paid_ad: ["instagram", "facebook", "tiktok", "youtube"] },
    territory: { worldwide: true, countries: [] }, maximumTermDays: 90, maximumClipSeconds: 60,
    clientDelivery: true, reposting: false, futureCampaigns: false, amountBaseUnits: "10000000",
    ...stellarTestnetUsdc, payeeAddress: null, active: true, expiresAt: null,
  },
];

export const demoDisclosure = "Demo catalog with CC0 audio and recorded provenance. Seller identities and offer terms are fixtures, not verified rights holders. A purchase records testnet terms and payment, not legal clearance or copyright ownership.";

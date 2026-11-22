import { z } from "zod";

export const marketPlatformSchema = z.enum(["instagram", "facebook", "tiktok", "youtube"]);

export const marketTerritorySchema = z.strictObject({
  worldwide: z.boolean(),
  countries: z.array(z.string().min(2).max(2)).max(249),
});

export const marketTermsSchema = z.strictObject({
  platforms: z.array(marketPlatformSchema).min(1).max(4),
  termDays: z.number().int().min(1).max(3650),
  territory: marketTerritorySchema,
  paidAds: z.boolean(),
  clientDelivery: z.boolean(),
  reposting: z.boolean(),
  futureCampaigns: z.boolean(),
  licenseCode: z.string().min(1).max(40),
  attributionText: z.string().min(1).max(1000),
  previewAllowed: z.boolean(),
});

export const marketOfferSchema = z.strictObject({
  id: z.string().min(1).max(120),
  version: z.number().int().positive(),
  title: z.string().min(1).max(300),
  artist: z.string().min(1).max(200),
  durationSeconds: z.number().int().positive(),
  priceBaseUnits: z.string().regex(/^\d+$/),
  asset: z.string().min(1).max(120),
  network: z.literal("stellar:testnet"),
  payee: z.string().length(56),
  moods: z.array(z.string().min(1).max(40)).max(4),
  energy: z.number().int().min(1).max(5),
  terms: marketTermsSchema,
});

export const marketOfferListSchema = z.strictObject({
  offers: z.array(marketOfferSchema),
});

export type MarketPlatform = z.infer<typeof marketPlatformSchema>;
export type MarketTerms = z.infer<typeof marketTermsSchema>;
export type MarketOffer = z.infer<typeof marketOfferSchema>;
export type MarketOfferList = z.infer<typeof marketOfferListSchema>;

export const MARKET_TERMS_EXTENSION_KEY = "io.grant.terms";
export const MARKET_NETWORK = "stellar:testnet";
export const MARKET_USDC_ASSET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

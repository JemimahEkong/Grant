import { z } from "zod";

const countryCodes = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" "),
);

export const platformSchema = z.enum(["instagram", "facebook", "tiktok", "youtube"]);
export const useSchema = z.enum(["organic", "paid_ad"]);

export const territorySchema = z.strictObject({
  worldwide: z.boolean(),
  countries: z.array(z.string().refine(code => countryCodes.has(code), "Use an uppercase ISO country code.")).max(249),
}).superRefine((territory, context) => {
  if (territory.worldwide && territory.countries.length > 0) {
    context.addIssue({ code: "custom", message: "Worldwide territory must have an empty country list." });
  }
  if (!territory.worldwide && territory.countries.length === 0) {
    context.addIssue({ code: "custom", message: "Choose at least one country." });
  }
  if (new Set(territory.countries).size !== territory.countries.length) {
    context.addIssue({ code: "custom", message: "Do not repeat countries." });
  }
});

export const briefSchema = z.strictObject({
  intendedUse: useSchema,
  platforms: z.array(platformSchema).min(1).max(4).refine(platforms => new Set(platforms).size === platforms.length, "Do not repeat platforms."),
  territory: territorySchema,
  termDays: z.number().int().min(1).max(3650),
  clipDurationSeconds: z.number().int().min(1).max(3600),
  mood: z.string().min(1).max(32).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  clientDelivery: z.boolean(),
  reposting: z.boolean(),
  futureCampaigns: z.boolean(),
});

export type Platform = z.infer<typeof platformSchema>;
export type IntendedUse = z.infer<typeof useSchema>;
export type Brief = z.infer<typeof briefSchema>;

export type Offer = {
  id: string;
  version: number;
  trackId: string;
  sellerId: string;
  title: string;
  mode: "fixture";
  kind: "base" | "addon";
  parentOfferId: string | null;
  parentOfferVersion: number | null;
  authority: { composition: boolean | null; master: boolean | null };
  platformsByUse: Partial<Record<IntendedUse, Platform[]>>;
  territory: Brief["territory"];
  maximumTermDays: number;
  maximumClipSeconds: number;
  clientDelivery: boolean | null;
  reposting: boolean | null;
  futureCampaigns: boolean | null;
  amountBaseUnits: string;
  network: string;
  assetContractId: string;
  assetDecimals: number;
  payeeAddress: string | null;
  active: boolean;
  expiresAt: string | null;
};

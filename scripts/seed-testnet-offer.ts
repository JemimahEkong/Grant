import { eq } from "drizzle-orm";
import { demoOffers } from "../demo/catalog";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { offers } from "../lib/db/schema";
import { assertActiveOffersDoNotPayTreasury, assertPayeeIsNotTreasury } from "../lib/payments/payee-guard";
import { isStellarPublicKey } from "../lib/payments/stellar-address";

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

async function main() {
  const payee = process.env.X402_SELLER_PUBLIC?.trim();
  if (!payee) throw new Error("X402_SELLER_PUBLIC is not configured.");
  if (!isStellarPublicKey(payee)) throw new Error("X402_SELLER_PUBLIC is not a valid Stellar public key.");
  assertPayeeIsNotTreasury(payee);

  let baseCount = 0;
  let addonCount = 0;
  for (const offer of demoOffers) {
    const isAddon = offer.kind === "addon";
    const id = isAddon ? `${offer.trackId}-testnet-addon` : `${offer.trackId}-testnet-base`;
    const parentOfferId = isAddon ? `${offer.trackId}-testnet-base` : null;
    const parentOfferVersion = isAddon ? 1 : null;
    await database.db
      .insert(offers)
      .values({
        id,
        version: 1,
        trackId: offer.trackId,
        sellerId: offer.sellerId,
        kind: offer.kind,
        parentOfferId,
        parentOfferVersion,
        authorityComposition: offer.authority.composition,
        authorityMaster: offer.authority.master,
        platformsOrganic: offer.platformsByUse.organic ?? [],
        platformsPaidAd: offer.platformsByUse.paid_ad ?? [],
        territoryWorldwide: offer.territory.worldwide,
        territoryCountries: offer.territory.countries,
        maximumTermDays: offer.maximumTermDays,
        maximumClipSeconds: offer.maximumClipSeconds,
        clientDelivery: offer.clientDelivery,
        reposting: offer.reposting,
        futureCampaigns: offer.futureCampaigns,
        amountBaseUnits: BigInt(offer.amountBaseUnits),
        network: offer.network,
        assetContractId: offer.assetContractId,
        assetDecimals: offer.assetDecimals,
        payeeAddress: payee,
        active: true,
        activeFrom: new Date("2020-01-01T00:00:00Z"),
        expiresAt: null,
      })
      .onConflictDoUpdate({
        target: [offers.id, offers.version],
        set: {
          kind: offer.kind,
          parentOfferId,
          parentOfferVersion,
          payeeAddress: payee,
          amountBaseUnits: BigInt(offer.amountBaseUnits),
          active: true,
          platformsOrganic: offer.platformsByUse.organic ?? [],
          platformsPaidAd: offer.platformsByUse.paid_ad ?? [],
          territoryWorldwide: offer.territory.worldwide,
          territoryCountries: offer.territory.countries,
          maximumTermDays: offer.maximumTermDays,
          maximumClipSeconds: offer.maximumClipSeconds,
          clientDelivery: offer.clientDelivery,
          reposting: offer.reposting,
          futureCampaigns: offer.futureCampaigns,
        },
      });
    if (isAddon) addonCount += 1;
    else baseCount += 1;
  }

  const updated = await database.db
    .update(offers)
    .set({ payeeAddress: payee })
    .where(eq(offers.active, true))
    .returning({ id: offers.id });
  await assertActiveOffersDoNotPayTreasury(database.db);

  console.log(`Testnet demo offers ready: ${baseCount} base offers and ${addonCount} add-on offers.`);
  console.log(`Repointed ${updated.length} active offers to the dedicated seller.`);
}

main()
  .catch(error => {
    console.error("Testnet offer seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

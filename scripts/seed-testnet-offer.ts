import { demoOffers } from "../demo/catalog";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { offers } from "../lib/db/schema";

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

async function main() {
  const payee = process.env.X402_SELLER_PUBLIC;
  if (!payee) throw new Error("X402_SELLER_PUBLIC is not configured.");

  let count = 0;
  for (const offer of demoOffers) {
    await database.db
      .insert(offers)
      .values({
        id: `${offer.trackId}-testnet-base`,
        version: 1,
        trackId: offer.trackId,
        sellerId: offer.sellerId,
        kind: "base",
        parentOfferId: null,
        parentOfferVersion: null,
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
    count += 1;
  }

  console.log(`Testnet demo offers ready: ${count} base offers.`);
}

main()
  .catch(error => {
    console.error("Testnet offer seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

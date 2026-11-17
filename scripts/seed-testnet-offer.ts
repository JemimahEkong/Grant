import { stellarTestnetUsdc } from "../demo/catalog";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { offers } from "../lib/db/schema";

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

async function main() {
  const payee = process.env.X402_SELLER_PUBLIC;
  if (!payee) throw new Error("X402_SELLER_PUBLIC is not configured.");

  await database.db
    .insert(offers)
    .values({
      id: "morning-edit-testnet-base",
      version: 1,
      trackId: "morning-edit",
      sellerId: "seller-demo-morning",
      kind: "base",
      parentOfferId: null,
      parentOfferVersion: null,
      authorityComposition: true,
      authorityMaster: true,
      platformsOrganic: ["instagram", "facebook", "tiktok", "youtube"],
      platformsPaidAd: ["instagram", "facebook", "tiktok", "youtube"],
      territoryWorldwide: true,
      territoryCountries: [],
      maximumTermDays: 90,
      maximumClipSeconds: 60,
      clientDelivery: true,
      reposting: true,
      futureCampaigns: false,
      amountBaseUnits: 10_000_000n,
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      assetDecimals: stellarTestnetUsdc.assetDecimals,
      payeeAddress: payee,
      active: true,
      activeFrom: new Date("2020-01-01T00:00:00Z"),
      expiresAt: null,
    })
    .onConflictDoUpdate({
      target: [offers.id, offers.version],
      set: {
        payeeAddress: payee,
        amountBaseUnits: 10_000_000n,
        active: true,
      },
    });

  console.log("Testnet demo offer ready: morning-edit-testnet-base version 1.");
}

main()
  .catch(error => {
    console.error("Testnet offer seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

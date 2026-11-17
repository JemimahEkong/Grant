import { createHash } from "node:crypto";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { stellarTestnetUsdc } from "../demo/catalog";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { randomId, sha256Hex } from "../lib/db/crypto";
import {
  approvePurchase,
  claimAttemptAndReserve,
  createProject,
  finalizeSettlement,
  markSigningStarted,
  quotePurchase,
} from "../lib/db/repositories";
import { artifacts, offers, user } from "../lib/db/schema";
import type { Brief } from "../lib/licensing/schema";
import { putPrivateObject } from "../lib/storage/r2";

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

const brief: Brief = {
  intendedUse: "organic",
  platforms: ["instagram", "tiktok"],
  territory: { worldwide: true, countries: [] },
  termDays: 90,
  clipDurationSeconds: 30,
  clientDelivery: true,
  reposting: false,
  futureCampaigns: false,
};

const pdfBody = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "endobj",
    "3 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
    "endobj",
    "trailer",
    "<< /Root 1 0 R >>",
    "%%EOF",
  ].join("\n"),
  "utf8",
);

async function main() {
  const ownerEmail = process.env.DEMO_TEST_EMAIL;
  const otherEmail = process.env.R2_OTHER_TEST_EMAIL;
  const payee = process.env.G0_SELLER_PUBLIC;
  if (!ownerEmail || !otherEmail || !payee) {
    throw new Error("R2 proof environment is incomplete.");
  }

  const [owner] = await database.db.select().from(user).where(eq(user.email, ownerEmail)).limit(1);
  if (!owner) throw new Error("The demo owner does not exist in the database.");

  const offerId = randomId("offer");
  await database.db.insert(offers).values({
    id: offerId,
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
  });

  const project = await createProject(database.db, {
    ownerId: owner.id,
    clientPrivateName: "R2 Proof Client",
    publicDisplayLabel: "R2 Proof Project",
    brief,
    budgetBaseUnits: "50000000",
    purchaseCapBaseUnits: "20000000",
  });

  const quote = await quotePurchase(database.db, {
    ownerId: owner.id,
    projectId: project.id,
    trackId: "morning-edit",
    offerId,
    offerVersion: 1,
    kind: "base",
    briefVersion: project.briefVersion,
    request: brief,
    idempotencyKey: randomId("key"),
  });
  if (quote.outcome !== "quoted" || !quote.purchase) {
    throw new Error(`Expected a quoted purchase, received ${quote.outcome}.`);
  }

  const approval = await approvePurchase(database.db, {
    ownerId: owner.id,
    purchaseId: quote.purchase.id,
    approvingHuman: "r2_proof_operator",
  });
  if (approval.outcome !== "approved") throw new Error(`Approval failed: ${approval.outcome}.`);

  const reserved = await claimAttemptAndReserve(database.db, {
    ownerId: owner.id,
    purchaseId: quote.purchase.id,
  });
  if (reserved.outcome !== "reserved") throw new Error(`Reservation failed: ${reserved.outcome}.`);

  const authorizationDigest = sha256Hex({ r2Proof: quote.purchase.id });
  const signed = await markSigningStarted(database.db, {
    ownerId: owner.id,
    purchaseId: quote.purchase.id,
    attemptId: reserved.attempt.id,
    authorizationDigest,
    authorizationValidUntil: new Date(Date.now() + 5 * 60 * 1000),
  });
  if (signed.outcome !== "signing_started") throw new Error(`Signing marker failed: ${signed.outcome}.`);

  const transactionHash = sha256Hex({ r2ProofSettlement: quote.purchase.id });
  const settlement = await finalizeSettlement(database.db, {
    ownerId: owner.id,
    purchaseId: quote.purchase.id,
    attemptId: reserved.attempt.id,
    network: stellarTestnetUsdc.network,
    assetContractId: stellarTestnetUsdc.assetContractId,
    payeeAddress: payee,
    amountBaseUnits: "10000000",
    transactionHash,
    settlementReference: `stellar:testnet:${transactionHash}:r2-proof`,
    authorizationDigest,
    verificationSource: "r2_proof_fixture",
    safeMetadata: { proofFixture: true, onChainVerified: false },
  });

  const objectKey = `licenses/${settlement.license.id}/r2-proof.pdf`;
  await putPrivateObject({
    key: objectKey,
    body: pdfBody,
    contentType: "application/pdf",
  });

  const artifactId = randomId("art");
  await database.db.insert(artifacts).values({
    id: artifactId,
    licenseId: settlement.license.id,
    kind: "license_pdf",
    objectKey,
    contentHash: createHash("sha256").update(pdfBody).digest("hex"),
    generationVersion: 1,
    state: "ready",
  });

  fs.writeFileSync(
    ".tmp-r2-proof.json",
    JSON.stringify(
      {
        ownerEmail,
        otherEmail,
        projectId: project.id,
        purchaseId: quote.purchase.id,
        licenseId: settlement.license.id,
        artifactId,
        offerId,
        objectKey,
        expectedSha256: createHash("sha256").update(pdfBody).digest("hex"),
        expectedSize: pdfBody.byteLength,
      },
      null,
      2,
    ) + "\n",
  );

  console.log("R2 proof fixture created.");
  console.log(`Purchase: ${quote.purchase.id}`);
  console.log(`License: ${settlement.license.id}`);
  console.log(`Private object: ${objectKey}`);
  console.log(`Expected bytes: ${pdfBody.byteLength}`);
}

main()
  .catch(error => {
    console.error("R2 proof setup failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

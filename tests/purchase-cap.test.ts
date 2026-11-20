import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stellarTestnetUsdc } from "../demo/catalog";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { randomId } from "../lib/db/crypto";
import {
  approvePurchase,
  claimAttemptAndReserve,
  createProject,
  getProjectForOwner,
  quotePurchase,
} from "../lib/db/repositories";
import {
  approvals,
  budgetAdjustments,
  offers,
  paymentAttempts,
  projects,
  purchases,
  refusals,
  reservations,
} from "../lib/db/schema";
import { seedDemoCatalog } from "../lib/db/seed";
import type { Brief } from "../lib/licensing/schema";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;
const ownerId = `test-cap-owner-${randomUUID()}`;
const testPayee = "GCPZ7PXUUNJ3DIOYB7DQMPAYDLQNMKW6ULGT4BE2JBO6E22HTACNTVPX";
const oneUsdc = "10000000";
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

let client: ReturnType<typeof createDatabase>;
let db: GrantDatabase;
let offerIds: string[] = [];

beforeAll(async () => {
  if (!testDatabaseUrl) return;
  client = createDatabase(testDatabaseUrl, { max: 1, idleTimeoutMillis: 1_000, connectionTimeoutMillis: 30_000 });
  db = client.db;
  await seedDemoCatalog(db);
  offerIds = [randomId("cap-offer"), randomId("cap-offer"), randomId("cap-offer")];
  const trackIds = ["morning-edit", "quiet-cut", "quiet-cut"];
  for (let index = 0; index < offerIds.length; index += 1) {
    await db.insert(offers).values({
      id: offerIds[index],
      version: 1,
      trackId: trackIds[index],
      sellerId: "seller-demo-cap",
      kind: "base",
      parentOfferId: null,
      parentOfferVersion: null,
      authorityComposition: true,
      authorityMaster: true,
      platformsOrganic: ["instagram", "facebook", "tiktok", "youtube"],
      platformsPaidAd: [],
      territoryWorldwide: true,
      territoryCountries: [],
      maximumTermDays: 90,
      maximumClipSeconds: 60,
      clientDelivery: true,
      reposting: false,
      futureCampaigns: false,
      amountBaseUnits: BigInt(oneUsdc),
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      assetDecimals: stellarTestnetUsdc.assetDecimals,
      payeeAddress: testPayee,
      active: true,
      activeFrom: new Date("2020-01-01T00:00:00Z"),
      expiresAt: null,
    });
  }
}, 30_000);

afterAll(async () => {
  if (!testDatabaseUrl) return;
  const projectRows = await db.select({ id: projects.id }).from(projects).where(inArray(projects.ownerId, [ownerId]));
  const projectIds = projectRows.map(row => row.id);
  if (projectIds.length > 0) {
    const purchaseRows = await db.select({ id: purchases.id }).from(purchases).where(inArray(purchases.projectId, projectIds));
    const purchaseIds = purchaseRows.map(row => row.id);
    if (purchaseIds.length > 0) {
      await db.delete(reservations).where(inArray(reservations.purchaseId, purchaseIds));
      await db.delete(approvals).where(inArray(approvals.purchaseId, purchaseIds));
      await db.delete(refusals).where(inArray(refusals.purchaseId, purchaseIds));
      await db.delete(paymentAttempts).where(inArray(paymentAttempts.purchaseId, purchaseIds));
      await db.delete(purchases).where(inArray(purchases.id, purchaseIds));
    }
    await db.delete(budgetAdjustments).where(inArray(budgetAdjustments.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (offerIds.length > 0) await db.delete(offers).where(inArray(offers.id, offerIds));
  await client.close();
}, 30_000);

async function makeProject(purchaseCountCap = 2) {
  return createProject(db, {
    ownerId,
    clientPrivateName: "Cap Test Client",
    publicDisplayLabel: "Cap Test Project",
    brief,
    purchaseCountCap,
  });
}

async function makeApprovedPurchase(projectId: string, offerIndex: number) {
  const quote = await quotePurchase(db, {
    ownerId,
    projectId,
    trackId: offerIndex === 0 ? "morning-edit" : "quiet-cut",
    offerId: offerIds[offerIndex],
    offerVersion: 1,
    kind: "base",
    briefVersion: 1,
    request: brief,
    idempotencyKey: randomId("key"),
  });
  if (quote.outcome !== "quoted" || !quote.purchase) throw new Error(`Quote failed: ${quote.outcome}.`);
  const approval = await approvePurchase(db, {
    ownerId,
    purchaseId: quote.purchase.id,
    approvingHuman: "cap_test",
  });
  if (approval.outcome !== "approved") throw new Error(`Approval failed: ${approval.outcome}.`);
  return approval.purchase;
}

dbDescribe("project purchase-count cap", () => {
  it("allows the second purchase and refuses the third", async () => {
    const project = await makeProject(2);
    const first = await makeApprovedPurchase(project.id, 0);
    const second = await makeApprovedPurchase(project.id, 1);
    const third = await makeApprovedPurchase(project.id, 2);

    const firstReserve = await claimAttemptAndReserve(db, { ownerId, purchaseId: first.id });
    const secondReserve = await claimAttemptAndReserve(db, { ownerId, purchaseId: second.id });
    const thirdReserve = await claimAttemptAndReserve(db, { ownerId, purchaseId: third.id });

    expect(firstReserve.outcome).toBe("reserved");
    expect(secondReserve.outcome).toBe("reserved");
    expect(thirdReserve.outcome).toBe("refused");
    if (thirdReserve.outcome === "refused") {
      expect(thirdReserve.reasons[0]?.code).toBe("PURCHASE_COUNT_CAP_EXCEEDED");
      expect(thirdReserve.purchase.status).toBe("refused");
    }

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget.purchaseCountCap).toBe(2);
    expect(view.budget.purchasesUsed).toBe(2);
  }, 60_000);

  it("serializes a concurrent pair so only one takes the last slot", async () => {
    const project = await makeProject(2);
    const first = await makeApprovedPurchase(project.id, 0);
    const second = await makeApprovedPurchase(project.id, 1);
    const third = await makeApprovedPurchase(project.id, 2);
    const firstReserve = await claimAttemptAndReserve(db, { ownerId, purchaseId: first.id });
    expect(firstReserve.outcome).toBe("reserved");

    const results = await Promise.all([
      claimAttemptAndReserve(db, { ownerId, purchaseId: second.id }),
      claimAttemptAndReserve(db, { ownerId, purchaseId: third.id }),
    ]);
    const reserved = results.filter(result => result.outcome === "reserved");
    const refused = results.filter(result => result.outcome === "refused");
    expect(reserved).toHaveLength(1);
    expect(refused).toHaveLength(1);
    if (refused[0].outcome === "refused") {
      expect(refused[0].reasons[0]?.code).toBe("PURCHASE_COUNT_CAP_EXCEEDED");
    }

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget.purchasesUsed).toBe(2);
  }, 60_000);
});

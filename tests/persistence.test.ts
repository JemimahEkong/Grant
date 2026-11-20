import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoOffers, stellarTestnetUsdc } from "../demo/catalog";
import { createDatabase, type GrantDatabase } from "../lib/db/client";
import { randomId, sha256Hex } from "../lib/db/crypto";
import {
  approvePurchase,
  claimAttemptAndReserve,
  createProject,
  finalizeSettlement,
  getProjectForOwner,
  getPurchaseForOwner,
  markSigningStarted,
  quoteAddonPurchase,
  quotePurchase,
  releaseUnsignedReservation,
} from "../lib/db/repositories";
import {
  approvals,
  artifacts,
  budgetAdjustments,
  licenses,
  offers,
  paymentAttempts,
  projects,
  purchases,
  receipts,
  refusals,
  reservations,
  shareLinks,
  type ProjectRow,
  type PurchaseRow,
} from "../lib/db/schema";
import { seedDemoCatalog } from "../lib/db/seed";
import type { Brief } from "../lib/licensing/schema";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const dbDescribe = testDatabaseUrl ? describe : describe.skip;

const ownerId = `test-owner-${randomUUID()}`;
const testPayee = "GCPZ7PXUUNJ3DIOYB7DQMPAYDLQNMKW6ULGT4BE2JBO6E22HTACNTVPX";
const testOffer = { id: "morning-edit-test-payee", version: 1, trackId: "morning-edit" };
const testAddonOffer = { id: "morning-edit-test-addon", version: 1, trackId: "morning-edit" };
const oneUsdc = "10000000";

const baseBrief: Brief = {
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

async function cleanupOwner() {
  const projectRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, ownerId));
  const projectIds = projectRows.map(row => row.id);
  if (projectIds.length === 0) return;

  const purchaseRows = await db.select({ id: purchases.id }).from(purchases).where(inArray(purchases.projectId, projectIds));
  const purchaseIds = purchaseRows.map(row => row.id);
  const licenseRows = await db.select({ id: licenses.id }).from(licenses).where(inArray(licenses.projectId, projectIds));
  const licenseIds = licenseRows.map(row => row.id);

  if (licenseIds.length > 0) {
    await db.delete(artifacts).where(inArray(artifacts.licenseId, licenseIds));
  }
  await db.delete(shareLinks).where(inArray(shareLinks.projectId, projectIds));
  if (purchaseIds.length > 0) {
    await db.delete(receipts).where(inArray(receipts.purchaseId, purchaseIds));
    await db.delete(reservations).where(inArray(reservations.purchaseId, purchaseIds));
    await db.delete(approvals).where(inArray(approvals.purchaseId, purchaseIds));
    await db.delete(refusals).where(inArray(refusals.purchaseId, purchaseIds));
    await db.delete(paymentAttempts).where(inArray(paymentAttempts.purchaseId, purchaseIds));
  }
  if (licenseIds.length > 0) {
    await db.delete(licenses).where(inArray(licenses.id, licenseIds));
  }
  if (purchaseIds.length > 0) {
    await db.delete(purchases).where(inArray(purchases.id, purchaseIds));
  }
  await db.delete(budgetAdjustments).where(inArray(budgetAdjustments.projectId, projectIds));
  await db.delete(refusals).where(eq(refusals.ownerId, ownerId));
  await db.delete(projects).where(inArray(projects.id, projectIds));
}

async function newProject(brief: Brief = baseBrief, options: { budgetBaseUnits?: string; purchaseCapBaseUnits?: string } = {}) {
  return createProject(db, {
    ownerId,
    clientPrivateName: `Test client ${randomId("c")}`,
    publicDisplayLabel: "Test client project",
    brief,
    ...options,
  });
}

async function quoteFor(project: ProjectRow, brief: Brief = baseBrief, key = randomId("key")) {
  return quotePurchase(db, {
    ownerId,
    projectId: project.id,
    trackId: testOffer.trackId,
    offerId: testOffer.id,
    offerVersion: testOffer.version,
    kind: "base",
    briefVersion: project.briefVersion,
    request: brief,
    idempotencyKey: key,
  });
}

async function quoteAndApprove(project: ProjectRow, brief: Brief = baseBrief) {
  const quote = await quoteFor(project, brief);
  if (quote.outcome !== "quoted" || !quote.purchase) throw new Error(`Expected a new quote, received ${quote.outcome}.`);
  const approval = await approvePurchase(db, { ownerId, purchaseId: quote.purchase.id, approvingHuman: "human_test" });
  if (approval.outcome !== "approved") throw new Error(`Expected approval, received ${approval.outcome}.`);
  return { purchase: approval.purchase, approval: approval.approval };
}

async function reserve(project: ProjectRow, brief: Brief = baseBrief) {
  const { purchase } = await quoteAndApprove(project, brief);
  const result = await claimAttemptAndReserve(db, { ownerId, purchaseId: purchase.id });
  if (result.outcome !== "reserved") throw new Error(`Expected reservation, received ${result.outcome}.`);
  return result;
}

async function sign(attempt: { id: string; purchaseId: string }) {
  const authorizationDigest = sha256Hex({ attemptId: attempt.id, nonce: randomId("nonce") });
  const result = await markSigningStarted(db, {
    ownerId,
    purchaseId: attempt.purchaseId,
    attemptId: attempt.id,
    authorizationDigest,
    nonce: randomId("nonce"),
    authorizationValidUntil: new Date(Date.now() + 5 * 60 * 1000),
  });
  if (result.outcome !== "signing_started") throw new Error(`Expected signing start, received ${result.outcome}.`);
  return { ...result, authorizationDigest };
}

function assertPurchase(value: PurchaseRow | null | undefined): PurchaseRow {
  if (!value) throw new Error("Expected a persisted purchase.");
  return value;
}

dbDescribe("Neon persistence and licensing workflow", () => {
  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    client = createDatabase(testDatabaseUrl, { max: 1, idleTimeoutMillis: 1_000, connectionTimeoutMillis: 30_000 });
    db = client.db;
    await seedDemoCatalog(db);
    await db
      .insert(offers)
      .values({
        id: testOffer.id,
        version: testOffer.version,
        trackId: testOffer.trackId,
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
        amountBaseUnits: BigInt(oneUsdc),
        network: stellarTestnetUsdc.network,
        assetContractId: stellarTestnetUsdc.assetContractId,
        assetDecimals: stellarTestnetUsdc.assetDecimals,
        payeeAddress: testPayee,
        active: true,
        activeFrom: new Date("2020-01-01T00:00:00Z"),
        expiresAt: null,
      })
      .onConflictDoUpdate({
        target: [offers.id, offers.version],
        set: { payeeAddress: testPayee, active: true },
      });
    await db
      .insert(offers)
      .values({
        id: testAddonOffer.id,
        version: testAddonOffer.version,
        trackId: testAddonOffer.trackId,
        sellerId: "seller-demo-morning",
        kind: "addon",
        parentOfferId: testOffer.id,
        parentOfferVersion: testOffer.version,
        authorityComposition: true,
        authorityMaster: true,
        platformsOrganic: [],
        platformsPaidAd: ["instagram", "facebook", "tiktok", "youtube"],
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
      })
      .onConflictDoUpdate({
        target: [offers.id, offers.version],
        set: { payeeAddress: testPayee, active: true, parentOfferId: testOffer.id, parentOfferVersion: testOffer.version },
      });
    expect(demoOffers).toHaveLength(4);
  }, 30_000);

  afterAll(async () => {
    if (!testDatabaseUrl) return;
    await cleanupOwner();
    await client.close();
  }, 30_000);

  it("persists a confirmed project and its demo budget", async () => {
    const project = await newProject();
    expect(project.briefVersion).toBe(1);
    expect(project.budgetBaseUnits).toBe(50_000_000n);
    expect(project.purchaseCapBaseUnits).toBe(20_000_000n);

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget).toMatchObject({
      budgetBaseUnits: "50000000",
      purchaseCapBaseUnits: "20000000",
      confirmedSpendBaseUnits: "0",
      activeReservationsBaseUnits: "0",
      adjustmentsBaseUnits: "0",
      availableBaseUnits: "50000000",
    });
  });

  it("reuses an idempotency key and the same logical intent without creating a second purchase", async () => {
    const project = await newProject();
    const key = randomId("key");
    const first = await quoteFor(project, baseBrief, key);
    expect(first.outcome).toBe("quoted");
    const purchase = assertPurchase(first.purchase);

    const sameKey = await quoteFor(project, baseBrief, key);
    expect(sameKey.outcome).toBe("reused");
    expect(assertPurchase(sameKey.purchase).id).toBe(purchase.id);

    const sameIntent = await quoteFor(project, baseBrief, randomId("key"));
    expect(sameIntent.outcome).toBe("reused");
    expect(assertPurchase(sameIntent.purchase).id).toBe(purchase.id);

    await expect(quoteFor(project, { ...baseBrief, platforms: ["youtube"] }, key)).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
    });

    const view = await getPurchaseForOwner(db, { ownerId, purchaseId: purchase.id });
    expect(view.purchase.priceBaseUnits).toBe(10_000_000n);
    expect(view.purchase.status).toBe("quoted");
    expect(view.purchase.coverageSnapshot.request).toEqual(baseBrief);
  });

  it("persists a specific rights refusal without an approval", async () => {
    const paidAdBrief: Brief = { ...baseBrief, intendedUse: "paid_ad" };
    const project = await newProject(paidAdBrief);
    const quote = await quotePurchase(db, {
      ownerId,
      projectId: project.id,
      trackId: "quiet-cut",
      offerId: "quiet-cut-base",
      offerVersion: 1,
      kind: "base",
      briefVersion: project.briefVersion,
      request: paidAdBrief,
      idempotencyKey: randomId("key"),
    });
    expect(quote.outcome).toBe("refused");
    const purchase = assertPurchase(quote.purchase);
    expect(purchase.status).toBe("refused");
    expect(quote.refusal?.reasonCode).toBe("USE_NOT_COVERED");

    const view = await getPurchaseForOwner(db, { ownerId, purchaseId: purchase.id });
    expect(view.approval).toBeNull();
    expect(view.refusal?.reasonCode).toBe("USE_NOT_COVERED");
  });

  it("binds a human approval to the immutable quote and refuses a missing payee", async () => {
    const project = await newProject();
    const quote = await quoteFor(project);
    const purchase = assertPurchase(quote.purchase);
    const approval = await approvePurchase(db, { ownerId, purchaseId: purchase.id, approvingHuman: "human_test" });
    expect(approval.outcome).toBe("approved");
    if (approval.outcome !== "approved") return;
    expect(approval.purchase.status).toBe("approved");
    expect(approval.purchase.approvalFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(approval.approval.fingerprint).toBe(approval.purchase.approvalFingerprint);

    const repeated = await approvePurchase(db, { ownerId, purchaseId: purchase.id, approvingHuman: "human_test" });
    expect(repeated.outcome).toBe("approved");
    if (repeated.outcome === "approved") expect(repeated.approval.id).toBe(approval.approval.id);

    const noPayeeProject = await newProject();
    const noPayee = await quotePurchase(db, {
      ownerId,
      projectId: noPayeeProject.id,
      trackId: "morning-edit",
      offerId: "morning-edit-base",
      offerVersion: 1,
      kind: "base",
      briefVersion: noPayeeProject.briefVersion,
      request: baseBrief,
      idempotencyKey: randomId("key"),
    });
    const noPayeePurchase = assertPurchase(noPayee.purchase);
    await expect(
      approvePurchase(db, { ownerId, purchaseId: noPayeePurchase.id, approvingHuman: "human_test" }),
    ).rejects.toMatchObject({ code: "PAYEE_NOT_CONFIGURED" });
  });

  it("reserves budget once and reports the durable hold", async () => {
    const project = await newProject();
    const reserved = await reserve(project);
    expect(reserved.purchase.status).toBe("reserved");
    expect(reserved.reservation.state).toBe("active");
    expect(reserved.reservation.amountBaseUnits).toBe(10_000_000n);
    expect(reserved.attempt.phase).toBe("created");
    expect(reserved.availableBaseUnits).toBe("40000000");

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget.activeReservationsBaseUnits).toBe("10000000");
    expect(view.budget.availableBaseUnits).toBe("40000000");

    await expect(claimAttemptAndReserve(db, { ownerId, purchaseId: reserved.purchase.id })).rejects.toMatchObject({
      code: "PAYMENT_IN_PROGRESS",
    });
  });

  it("serializes concurrent reservation attempts for one purchase", async () => {
    const project = await newProject();
    const { purchase } = await quoteAndApprove(project);
    const results = await Promise.allSettled([
      claimAttemptAndReserve(db, { ownerId, purchaseId: purchase.id }),
      claimAttemptAndReserve(db, { ownerId, purchaseId: purchase.id }),
    ]);
    const fulfilled = results.filter(result => result.status === "fulfilled");
    const rejected = results.filter(result => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (fulfilled[0].status === "fulfilled") expect(fulfilled[0].value.outcome).toBe("reserved");
    if (rejected[0].status === "rejected") {
      expect((rejected[0].reason as { code?: string }).code).toMatch(/PAYMENT_IN_PROGRESS|RESERVATION_CONFLICT/);
    }

    const active = await db
      .select()
      .from(reservations)
      .where(and(eq(reservations.purchaseId, purchase.id), eq(reservations.state, "active")));
    expect(active).toHaveLength(1);
  });

  it("refuses a purchase above the project cap", async () => {
    const project = await newProject(baseBrief, { purchaseCapBaseUnits: "5000000" });
    const { purchase } = await quoteAndApprove(project);
    const result = await claimAttemptAndReserve(db, { ownerId, purchaseId: purchase.id });
    expect(result.outcome).toBe("refused");
    if (result.outcome !== "refused") return;
    expect(result.reasons[0].code).toBe("PURCHASE_CAP_EXCEEDED");
    expect(result.purchase.status).toBe("refused");
    expect(result.refusal.reasonCode).toBe("PURCHASE_CAP_EXCEEDED");
    const held = await db.select().from(reservations).where(eq(reservations.purchaseId, purchase.id));
    expect(held).toHaveLength(0);
  });

  it("refuses a purchase above the available budget after a labeled demo adjustment", async () => {
    const project = await newProject();
    await db.insert(budgetAdjustments).values({
      id: randomId("adj"),
      projectId: project.id,
      amountBaseUnits: 45_000_000n,
      reason: "Labeled demo adjustment for a budget refusal scenario.",
      createdBy: "operator_test",
    });
    const { purchase } = await quoteAndApprove(project);
    const result = await claimAttemptAndReserve(db, { ownerId, purchaseId: purchase.id });
    expect(result.outcome).toBe("refused");
    if (result.outcome !== "refused") return;
    expect(result.reasons[0].code).toBe("PROJECT_BUDGET_EXCEEDED");
    expect(result.availableBaseUnits).toBe("5000000");

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget.adjustmentsBaseUnits).toBe("45000000");
    expect(view.budget.availableBaseUnits).toBe("5000000");
  });

  it("releases an unsigned reservation but refuses to release after the signing marker", async () => {
    const project = await newProject();
    const reserved = await reserve(project);
    const released = await releaseUnsignedReservation(db, {
      ownerId,
      purchaseId: reserved.purchase.id,
      attemptId: reserved.attempt.id,
    });
    expect(released.purchase.status).toBe("failed_no_settlement");
    expect(released.reservation.state).toBe("released");
    expect(released.attempt.phase).toBe("no_settlement_verified");

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget.activeReservationsBaseUnits).toBe("0");
    expect(view.budget.availableBaseUnits).toBe("50000000");

    const secondProject = await newProject();
    const secondReserved = await reserve(secondProject);
    const signed = await sign(secondReserved.attempt);
    expect(signed.purchase.status).toBe("payment_pending");
    expect(signed.attempt.phase).toBe("signing_started");
    expect(signed.attempt.authorizationDigest).toBe(signed.authorizationDigest);
    await expect(
      releaseUnsignedReservation(db, {
        ownerId,
        purchaseId: secondReserved.purchase.id,
        attemptId: secondReserved.attempt.id,
      }),
    ).rejects.toMatchObject({ code: "SIGNING_MAY_HAVE_OCCURRED" });
  });

  it("finalizes a verified testnet settlement once and preserves the receipt, license, and budget accounting", async () => {
    const project = await newProject();
    const reserved = await reserve(project);
    const signed = await sign(reserved.attempt);
    const verifiedAt = new Date();
    const transactionHash = sha256Hex({ test: "settlement", purchaseId: reserved.purchase.id });
    const settlementReference = `stellar:testnet:${transactionHash}:0`;

    const settlement = await finalizeSettlement(db, {
      ownerId,
      purchaseId: reserved.purchase.id,
      attemptId: reserved.attempt.id,
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      payeeAddress: testPayee,
      amountBaseUnits: oneUsdc,
      transactionHash,
      settlementReference,
      authorizationDigest: signed.authorizationDigest,
      ledger: 123456n,
      verificationSource: "test_double_verified_receipt",
      verifiedAt,
      safeMetadata: { testOnly: true, transferCount: 1 },
    });
    expect(settlement.outcome).toBe("settled");
    expect(settlement.idempotent).toBe(false);
    expect(settlement.purchase.status).toBe("settled");
    expect(settlement.purchase.settledAt?.toISOString()).toBe(verifiedAt.toISOString());
    expect(settlement.receipt.transactionHash).toBe(transactionHash);
    expect(settlement.receipt.amountBaseUnits).toBe(10_000_000n);
    expect(settlement.license.purchaseId).toBe(reserved.purchase.id);
    expect(settlement.license.endsAt.getTime() - settlement.license.startsAt.getTime()).toBe(90 * 86_400_000);

    const repeated = await finalizeSettlement(db, {
      ownerId,
      purchaseId: reserved.purchase.id,
      attemptId: reserved.attempt.id,
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      payeeAddress: testPayee,
      amountBaseUnits: oneUsdc,
      transactionHash,
      settlementReference,
      authorizationDigest: signed.authorizationDigest,
      ledger: 123456n,
      verificationSource: "test_double_verified_receipt",
      verifiedAt,
    });
    expect(repeated.idempotent).toBe(true);
    expect(repeated.receipt.id).toBe(settlement.receipt.id);
    expect(repeated.license.id).toBe(settlement.license.id);

    await expect(
      finalizeSettlement(db, {
        ownerId,
        purchaseId: reserved.purchase.id,
        attemptId: reserved.attempt.id,
        network: stellarTestnetUsdc.network,
        assetContractId: stellarTestnetUsdc.assetContractId,
        payeeAddress: testPayee,
        amountBaseUnits: oneUsdc,
        transactionHash: sha256Hex({ test: "different", purchaseId: reserved.purchase.id }),
        settlementReference: `stellar:testnet:${sha256Hex({ test: "different", purchaseId: reserved.purchase.id })}:0`,
        verificationSource: "test_double_verified_receipt",
      }),
    ).rejects.toMatchObject({ code: "RECEIPT_CONFLICT" });

    const view = await getProjectForOwner(db, { ownerId, projectId: project.id });
    expect(view.budget.confirmedSpendBaseUnits).toBe("10000000");
    expect(view.budget.activeReservationsBaseUnits).toBe("0");
    expect(view.budget.availableBaseUnits).toBe("40000000");

    const purchaseView = await getPurchaseForOwner(db, { ownerId, purchaseId: reserved.purchase.id });
    expect(purchaseView.receipt?.id).toBe(settlement.receipt.id);
    expect(purchaseView.license?.id).toBe(settlement.license.id);
    expect(purchaseView.attempts[0].phase).toBe("settled_verified");
    expect(purchaseView.reservation?.state).toBe("settled");
  });

  it("fails closed on settlement mismatch and ownership violations", async () => {
    const project = await newProject();
    const reserved = await reserve(project);
    const signed = await sign(reserved.attempt);
    const transactionHash = sha256Hex({ test: "mismatch", purchaseId: reserved.purchase.id });
    await expect(
      finalizeSettlement(db, {
        ownerId,
        purchaseId: reserved.purchase.id,
        attemptId: reserved.attempt.id,
        network: stellarTestnetUsdc.network,
        assetContractId: stellarTestnetUsdc.assetContractId,
        payeeAddress: testPayee,
        amountBaseUnits: "9999999",
        transactionHash,
        settlementReference: `stellar:testnet:${transactionHash}:0`,
        authorizationDigest: signed.authorizationDigest,
        verificationSource: "test_double_verified_receipt",
      }),
    ).rejects.toMatchObject({ code: "SETTLEMENT_MISMATCH" });

    await expect(getProjectForOwner(db, { ownerId: "another-owner", projectId: project.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(getPurchaseForOwner(db, { ownerId: "another-owner", purchaseId: reserved.purchase.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("quotes and settles a paid-ad add-on with its own receipt and combined coverage", async () => {
    const unsettledProject = await newProject();
    const unsettledQuote = await quoteFor(unsettledProject);
    const unsettledPurchase = assertPurchase(unsettledQuote.purchase);
    await expect(
      quoteAddonPurchase(db, {
        ownerId,
        parentPurchaseId: unsettledPurchase.id,
        offerId: testAddonOffer.id,
        offerVersion: testAddonOffer.version,
        idempotencyKey: randomId("key"),
      }),
    ).rejects.toMatchObject({ code: "ADDON_NOT_AVAILABLE" });

    const project = await newProject();
    const baseReservation = await reserve(project);
    const baseSignature = await sign(baseReservation.attempt);
    const baseVerifiedAt = new Date();
    const baseTransactionHash = sha256Hex({ base: baseReservation.purchase.id, nonce: randomId("tx") });
    const baseSettlement = await finalizeSettlement(db, {
      ownerId,
      purchaseId: baseReservation.purchase.id,
      attemptId: baseReservation.attempt.id,
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      payeeAddress: testPayee,
      amountBaseUnits: oneUsdc,
      transactionHash: baseTransactionHash,
      settlementReference: `stellar:testnet:${baseTransactionHash}:0`,
      authorizationDigest: baseSignature.authorizationDigest,
      ledger: 123456n,
      verificationSource: "test_addon_base",
      verifiedAt: baseVerifiedAt,
    });
    expect(baseSettlement.license.kind).toBe("base");

    const addonQuote = await quoteAddonPurchase(db, {
      ownerId,
      parentPurchaseId: baseSettlement.purchase.id,
      offerId: testAddonOffer.id,
      offerVersion: testAddonOffer.version,
      idempotencyKey: randomId("key"),
    });
    expect(addonQuote.outcome).toBe("quoted");
    const addonPurchase = assertPurchase(addonQuote.purchase);
    expect(addonPurchase.kind).toBe("addon");
    expect(addonPurchase.parentPurchaseId).toBe(baseSettlement.purchase.id);
    expect(addonPurchase.priceBaseUnits).toBe(10_000_000n);
    expect(addonPurchase.coverageSnapshot.request).toMatchObject({
      intendedUse: "paid_ad",
      platforms: baseBrief.platforms,
      termDays: baseBrief.termDays,
      clientDelivery: baseBrief.clientDelivery,
      reposting: false,
      futureCampaigns: false,
    });

    const addonApproval = await approvePurchase(db, {
      ownerId,
      purchaseId: addonPurchase.id,
      approvingHuman: "human_addon",
    });
    if (addonApproval.outcome !== "approved") throw new Error(`Expected add-on approval, received ${addonApproval.outcome}.`);
    const addonReservation = await claimAttemptAndReserve(db, { ownerId, purchaseId: addonPurchase.id });
    if (addonReservation.outcome !== "reserved") {
      throw new Error(`Expected add-on reservation, received ${addonReservation.outcome}.`);
    }
    const addonSignature = await sign(addonReservation.attempt);
    const addonTransactionHash = sha256Hex({ addon: addonPurchase.id, nonce: randomId("tx") });
    const addonSettlement = await finalizeSettlement(db, {
      ownerId,
      purchaseId: addonPurchase.id,
      attemptId: addonReservation.attempt.id,
      network: stellarTestnetUsdc.network,
      assetContractId: stellarTestnetUsdc.assetContractId,
      payeeAddress: testPayee,
      amountBaseUnits: oneUsdc,
      transactionHash: addonTransactionHash,
      settlementReference: `stellar:testnet:${addonTransactionHash}:0`,
      authorizationDigest: addonSignature.authorizationDigest,
      ledger: 123457n,
      verificationSource: "test_addon_settlement",
      verifiedAt: new Date(baseVerifiedAt.getTime() + 60_000),
    });
    expect(addonSettlement.license.kind).toBe("addon");
    expect(addonSettlement.license.parentLicenseId).toBe(baseSettlement.license.id);
    expect(addonSettlement.license.endsAt.getTime()).toBe(baseSettlement.license.endsAt.getTime());
    expect(addonSettlement.receipt.amountBaseUnits).toBe(10_000_000n);
    expect(addonSettlement.receipt.transactionHash).not.toBe(baseSettlement.receipt.transactionHash);

    const baseView = await getPurchaseForOwner(db, { ownerId, purchaseId: baseSettlement.purchase.id });
    expect(baseView.combinedCoverage?.baseLicense?.licenseId).toBe(baseSettlement.license.id);
    expect(baseView.combinedCoverage?.addonLicenses).toHaveLength(1);
    expect(baseView.combinedCoverage?.addonLicenses[0]?.licenseId).toBe(addonSettlement.license.id);
    expect(baseView.combinedCoverage?.organicPlatforms).toEqual(baseBrief.platforms);
    expect(baseView.combinedCoverage?.paidAdPlatforms).toEqual(baseBrief.platforms);
    expect(baseView.combinedCoverage?.totalBaseUnits).toBe("20000000");

    const addonView = await getPurchaseForOwner(db, { ownerId, purchaseId: addonPurchase.id });
    expect(addonView.combinedCoverage?.baseLicense?.licenseId).toBe(baseSettlement.license.id);
    expect(addonView.combinedCoverage?.addonLicenses[0]?.licenseId).toBe(addonSettlement.license.id);
  }, 60_000);
});

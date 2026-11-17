import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { isStellarPublicKey } from "../payments/stellar-address";
import { briefSchema } from "../licensing/schema";
import { matchOffer } from "../licensing/match";
import type { CoverageSnapshot, StoredOfferSnapshot } from "../licensing/types";
import { demoLimits, parseAmountBaseUnits, parsePositiveAmountBaseUnits } from "../policy/budget";
import type { DatabaseTransaction, GrantDatabase } from "./client";
import { randomId, sha256Hex } from "./crypto";
import { RepositoryError, isUniqueViolation } from "./errors";
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
  type ApprovalRow,
  type ArtifactRow,
  type BudgetAdjustmentRow,
  type LicenseRow,
  type OfferRow,
  type PaymentAttemptRow,
  type ProjectRow,
  type PurchaseRow,
  type ReceiptRow,
  type RefusalRow,
  type ReservationRow,
} from "./schema";

const activeIntentStatuses = ["quoted", "approved", "reserved", "payment_pending", "settled", "issuing", "ready"] as const;
type PersistedReason = { code: string; message: string };

export type QuotePurchaseInput = {
  ownerId: string;
  projectId: string;
  trackId: string;
  offerId: string;
  offerVersion: number;
  kind: "base" | "addon";
  parentPurchaseId?: string | null;
  briefVersion: number;
  request: unknown;
  idempotencyKey: string;
  now?: Date;
};

export type QuoteOutcome = {
  outcome: "quoted" | "reused" | "refused";
  purchase: PurchaseRow | null;
  refusal?: RefusalRow;
  reasons?: PersistedReason[];
};

export type ApprovalOutcome =
  | { outcome: "approved"; purchase: PurchaseRow; approval: ApprovalRow }
  | { outcome: "expired"; purchase: PurchaseRow };

export type ReserveOutcome =
  | {
      outcome: "reserved";
      purchase: PurchaseRow;
      attempt: PaymentAttemptRow;
      reservation: ReservationRow;
      availableBaseUnits: string;
    }
  | {
      outcome: "refused";
      purchase: PurchaseRow;
      refusal: RefusalRow;
      reasons: PersistedReason[];
      availableBaseUnits: string;
    }
  | {
      outcome: "expired";
      purchase: PurchaseRow;
      reasonCode: "APPROVAL_EXPIRED" | "OFFER_INACTIVE" | "OFFER_CHANGED";
    };

export type SigningStartOutcome =
  | {
      outcome: "signing_started";
      purchase: PurchaseRow;
      attempt: PaymentAttemptRow;
      reservation: ReservationRow;
    }
  | {
      outcome: "expired";
      purchase: PurchaseRow;
      attempt: PaymentAttemptRow;
      reservation: ReservationRow;
      reasonCode: "APPROVAL_EXPIRED" | "OFFER_CHANGED" | "OFFER_INACTIVE";
    };

export type ReleaseOutcome = {
  outcome: "released";
  purchase: PurchaseRow;
  attempt: PaymentAttemptRow;
  reservation: ReservationRow;
};

export type FinalizeSettlementInput = {
  ownerId: string;
  purchaseId: string;
  attemptId: string;
  network: string;
  assetContractId: string;
  payeeAddress: string;
  amountBaseUnits: string;
  transactionHash: string;
  settlementReference: string;
  authorizationDigest?: string | null;
  ledger?: bigint | null;
  verificationSource: string;
  verifiedAt?: Date;
  safeMetadata?: Record<string, unknown>;
};

export type FinalizeSettlementOutcome = {
  outcome: "settled";
  purchase: PurchaseRow;
  receipt: ReceiptRow;
  license: LicenseRow;
  idempotent: boolean;
};

export type ProjectBudgetSummary = {
  budgetBaseUnits: string;
  purchaseCapBaseUnits: string;
  confirmedSpendBaseUnits: string;
  activeReservationsBaseUnits: string;
  adjustmentsBaseUnits: string;
  availableBaseUnits: string;
};

export type ProjectView = {
  project: ProjectRow;
  purchases: PurchaseRow[];
  refusals: RefusalRow[];
  adjustments: BudgetAdjustmentRow[];
  budget: ProjectBudgetSummary;
};

export type PurchaseView = {
  purchase: PurchaseRow;
  approval: ApprovalRow | null;
  reservation: ReservationRow | null;
  attempts: PaymentAttemptRow[];
  receipt: ReceiptRow | null;
  license: LicenseRow | null;
  artifacts: ArtifactRow[];
  refusal: RefusalRow | null;
};

function isSettledStatus(status: PurchaseRow["status"]): boolean {
  return status === "settled" || status === "issuing" || status === "ready";
}

function notFound(message = "The requested record was not found for this owner.") {
  return new RepositoryError("NOT_FOUND", message, 404);
}

function storedOfferSnapshot(row: OfferRow): StoredOfferSnapshot {
  return {
    id: row.id,
    version: row.version,
    trackId: row.trackId,
    sellerId: row.sellerId,
    kind: row.kind,
    parentOfferId: row.parentOfferId,
    parentOfferVersion: row.parentOfferVersion,
    authority: { composition: row.authorityComposition, master: row.authorityMaster },
    platformsByUse: { organic: row.platformsOrganic, paid_ad: row.platformsPaidAd },
    territory: { worldwide: row.territoryWorldwide, countries: row.territoryCountries },
    maximumTermDays: row.maximumTermDays,
    maximumClipSeconds: row.maximumClipSeconds,
    clientDelivery: row.clientDelivery,
    reposting: row.reposting,
    futureCampaigns: row.futureCampaigns,
    amountBaseUnits: row.amountBaseUnits.toString(),
    network: row.network,
    assetContractId: row.assetContractId,
    assetDecimals: row.assetDecimals,
    payeeAddress: row.payeeAddress,
  };
}

export function purchaseFingerprint(purchase: PurchaseRow): string {
  return sha256Hex({
    id: purchase.id,
    ownerId: purchase.ownerId,
    projectId: purchase.projectId,
    requestHash: purchase.requestHash,
    coverageHash: purchase.coverageHash,
    offerId: purchase.offerId,
    offerVersion: purchase.offerVersion,
    kind: purchase.kind,
    parentPurchaseId: purchase.parentPurchaseId,
    priceBaseUnits: purchase.priceBaseUnits.toString(),
    termDays: purchase.termDays,
    network: purchase.network,
    assetContractId: purchase.assetContractId,
    assetDecimals: purchase.assetDecimals,
    payeeAddress: purchase.payeeAddress,
    quoteExpiresAt: purchase.quoteExpiresAt.toISOString(),
  });
}

async function settledSpend(tx: Pick<GrantDatabase, "select">, projectId: string): Promise<bigint> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${purchases.priceBaseUnits}), 0)::text` })
    .from(purchases)
    .where(and(eq(purchases.projectId, projectId), inArray(purchases.status, ["settled", "issuing", "ready"])));
  return BigInt(row?.total ?? "0");
}

async function activeReservationTotal(tx: Pick<GrantDatabase, "select">, projectId: string): Promise<bigint> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${reservations.amountBaseUnits}), 0)::text` })
    .from(reservations)
    .where(and(eq(reservations.projectId, projectId), eq(reservations.state, "active")));
  return BigInt(row?.total ?? "0");
}

async function adjustmentTotal(tx: Pick<GrantDatabase, "select">, projectId: string): Promise<bigint> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${budgetAdjustments.amountBaseUnits}), 0)::text` })
    .from(budgetAdjustments)
    .where(eq(budgetAdjustments.projectId, projectId));
  return BigInt(row?.total ?? "0");
}

function budgetSummary(
  project: ProjectRow,
  confirmedSpend: bigint,
  activeReservations: bigint,
  adjustments: bigint,
): ProjectBudgetSummary {
  const available = project.budgetBaseUnits - adjustments - confirmedSpend - activeReservations;
  return {
    budgetBaseUnits: project.budgetBaseUnits.toString(),
    purchaseCapBaseUnits: project.purchaseCapBaseUnits.toString(),
    confirmedSpendBaseUnits: confirmedSpend.toString(),
    activeReservationsBaseUnits: activeReservations.toString(),
    adjustmentsBaseUnits: adjustments.toString(),
    availableBaseUnits: (available > 0n ? available : 0n).toString(),
  };
}

async function insertRefusal(
  tx: DatabaseTransaction,
  input: {
    ownerId: string;
    projectId: string | null;
    purchaseId: string | null;
    reasonCode: string;
    safeExplanation: string;
    now: Date;
  },
): Promise<RefusalRow> {
  const [row] = await tx
    .insert(refusals)
    .values({
      id: randomId("ref"),
      ownerId: input.ownerId,
      projectId: input.projectId,
      purchaseId: input.purchaseId,
      reasonCode: input.reasonCode,
      safeExplanation: input.safeExplanation,
      createdAt: input.now,
    })
    .returning();
  return row;
}

async function refusePurchase(
  tx: DatabaseTransaction,
  purchase: PurchaseRow,
  reasonCode: string,
  safeExplanation: string,
  now: Date,
): Promise<{ purchase: PurchaseRow; refusal: RefusalRow }> {
  const [updated] = await tx
    .update(purchases)
    .set({ status: "refused", updatedAt: now })
    .where(eq(purchases.id, purchase.id))
    .returning();
  const refusal = await insertRefusal(tx, {
    ownerId: purchase.ownerId,
    projectId: purchase.projectId,
    purchaseId: purchase.id,
    reasonCode,
    safeExplanation,
    now,
  });
  return { purchase: updated, refusal };
}

async function outcomeForExistingPurchase(tx: DatabaseTransaction, purchase: PurchaseRow): Promise<QuoteOutcome> {
  if (purchase.status === "refused") {
    const [refusal] = await tx
      .select()
      .from(refusals)
      .where(eq(refusals.purchaseId, purchase.id))
      .orderBy(desc(refusals.createdAt))
      .limit(1);
    if (refusal) {
      return {
        outcome: "refused",
        purchase,
        refusal,
        reasons: [{ code: refusal.reasonCode, message: refusal.safeExplanation }],
      };
    }
  }
  return { outcome: "reused", purchase };
}

export async function createProject(
  db: GrantDatabase,
  input: {
    ownerId: string;
    clientPrivateName: string;
    publicDisplayLabel: string;
    brief: unknown;
    budgetBaseUnits?: string;
    purchaseCapBaseUnits?: string;
    id?: string;
  },
): Promise<ProjectRow> {
  const ownerId = z.string().min(1).max(200).parse(input.ownerId);
  const clientPrivateName = z.string().min(1).max(200).parse(input.clientPrivateName);
  const publicDisplayLabel = z.string().min(1).max(200).parse(input.publicDisplayLabel);
  const brief = briefSchema.parse(input.brief);
  const budgetBaseUnits = parseAmountBaseUnits(input.budgetBaseUnits ?? demoLimits.projectBudget);
  const purchaseCapBaseUnits = parseAmountBaseUnits(input.purchaseCapBaseUnits ?? demoLimits.perPurchaseCap);

  const [project] = await db
    .insert(projects)
    .values({
      id: input.id ?? randomId("prj"),
      ownerId,
      clientPrivateName,
      publicDisplayLabel,
      briefVersion: 1,
      briefSnapshot: brief,
      briefHash: sha256Hex(brief),
      budgetBaseUnits,
      purchaseCapBaseUnits,
    })
    .returning();
  return project;
}

export async function getProjectForOwner(
  db: GrantDatabase,
  input: { ownerId: string; projectId: string },
): Promise<ProjectView> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)))
    .limit(1);
  if (!project) throw notFound();

  const [projectPurchases, projectRefusals, projectAdjustments, confirmedSpend, activeReservations, adjustments] =
    await Promise.all([
      db.select().from(purchases).where(eq(purchases.projectId, project.id)).orderBy(desc(purchases.createdAt)),
      db.select().from(refusals).where(eq(refusals.projectId, project.id)).orderBy(desc(refusals.createdAt)),
      db.select().from(budgetAdjustments).where(eq(budgetAdjustments.projectId, project.id)).orderBy(desc(budgetAdjustments.createdAt)),
      settledSpend(db, project.id),
      activeReservationTotal(db, project.id),
      adjustmentTotal(db, project.id),
    ]);

  return {
    project,
    purchases: projectPurchases,
    refusals: projectRefusals,
    adjustments: projectAdjustments,
    budget: budgetSummary(project, confirmedSpend, activeReservations, adjustments),
  };
}

export async function addBudgetAdjustment(
  db: GrantDatabase,
  input: {
    ownerId: string;
    projectId: string;
    amountBaseUnits: string;
    reason: string;
    createdBy: string;
  },
): Promise<BudgetAdjustmentRow> {
  const amountBaseUnits = parsePositiveAmountBaseUnits(input.amountBaseUnits);
  const reason = z.string().min(1).max(500).parse(input.reason);
  const createdBy = z.string().min(1).max(200).parse(input.createdBy);

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)))
    .limit(1);
  if (!project) throw notFound();

  const [adjustment] = await db
    .insert(budgetAdjustments)
    .values({
      id: randomId("adj"),
      projectId: project.id,
      amountBaseUnits,
      reason,
      createdBy,
    })
    .returning();
  return adjustment;
}

export async function quotePurchase(db: GrantDatabase, input: QuotePurchaseInput): Promise<QuoteOutcome> {
  const now = input.now ?? new Date();
  const brief = briefSchema.parse(input.request);
  const briefHash = sha256Hex(brief);
  const idempotencyKey = z.string().min(8).max(200).parse(input.idempotencyKey);
  const briefVersion = z.number().int().positive().parse(input.briefVersion);
  const parentPurchaseId = input.parentPurchaseId ?? null;
  if (input.kind === "base" && parentPurchaseId !== null) {
    throw new RepositoryError("REQUEST_MISMATCH", "A base purchase cannot reference a parent purchase.", 400);
  }
  if (input.kind === "addon") {
    throw new RepositoryError("ADDON_NOT_IMPLEMENTED", "Paid-ad add-ons are not enabled in this milestone.", 422);
  }

  const requestHash = sha256Hex({
    ownerId: input.ownerId,
    projectId: input.projectId,
    trackId: input.trackId,
    offerId: input.offerId,
    offerVersion: input.offerVersion,
    kind: input.kind,
    parentPurchaseId,
    briefVersion,
    request: brief,
  });
  const logicalIntentKey = sha256Hex({
    ownerId: input.ownerId,
    projectId: input.projectId,
    trackId: input.trackId,
    offerId: input.offerId,
    offerVersion: input.offerVersion,
    kind: input.kind,
    parentPurchaseId,
    briefVersion,
  });
  const quoteExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  try {
    return await db.transaction(async tx => {
      const [existingByKey] = await tx
        .select()
        .from(purchases)
        .where(and(eq(purchases.ownerId, input.ownerId), eq(purchases.idempotencyKey, idempotencyKey)))
        .limit(1);
      if (existingByKey) {
        if (existingByKey.requestHash !== requestHash) {
          throw new RepositoryError("IDEMPOTENCY_KEY_REUSED", "This idempotency key belongs to a different request.", 409);
        }
        return outcomeForExistingPurchase(tx, existingByKey);
      }

      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)))
        .limit(1);
      if (!project) throw notFound();
      if (project.briefVersion !== briefVersion) {
        throw new RepositoryError("BRIEF_VERSION_MISMATCH", "The confirmed project brief version does not match this request.", 409);
      }
      if (project.briefHash !== briefHash) {
        throw new RepositoryError("BRIEF_MISMATCH", "The request does not match the confirmed project brief.", 409);
      }

      const [existingByIntent] = await tx
        .select()
        .from(purchases)
        .where(
          and(
            eq(purchases.ownerId, input.ownerId),
            eq(purchases.logicalIntentKey, logicalIntentKey),
            inArray(purchases.status, [...activeIntentStatuses]),
          ),
        )
        .orderBy(desc(purchases.createdAt))
        .limit(1);

      if (existingByIntent) {
        if ((existingByIntent.status === "quoted" || existingByIntent.status === "approved") && existingByIntent.quoteExpiresAt <= now) {
          await tx.update(purchases).set({ status: "expired", updatedAt: now }).where(eq(purchases.id, existingByIntent.id));
        } else {
          return outcomeForExistingPurchase(tx, existingByIntent);
        }
      }

      const [offer] = await tx
        .select()
        .from(offers)
        .where(and(eq(offers.id, input.offerId), eq(offers.version, input.offerVersion)))
        .limit(1);
      if (!offer) throw notFound("The requested offer was not found.");
      if (offer.trackId !== input.trackId || offer.kind !== input.kind) {
        throw new RepositoryError("REQUEST_MISMATCH", "The offer does not match the requested track and kind.", 400);
      }

      const snapshot = storedOfferSnapshot(offer);
      const coverageResult = matchOffer(brief, snapshot);
      const coverageSnapshot: CoverageSnapshot = { request: brief, offer: snapshot, result: coverageResult };
      const offerIsAvailable = offer.active && offer.activeFrom <= now && (offer.expiresAt === null || offer.expiresAt > now);

      let status: "quoted" | "refused" = "quoted";
      let reasons: PersistedReason[] = [];
      if (!offerIsAvailable) {
        status = "refused";
        reasons = [{ code: "OFFER_NOT_ACTIVE", message: "This offer is not available for a new quote." }];
      } else if (!coverageResult.compatible) {
        status = "refused";
        reasons = coverageResult.reasons;
      }

      const [purchase] = await tx
        .insert(purchases)
        .values({
          id: randomId("pur"),
          ownerId: input.ownerId,
          projectId: input.projectId,
          trackId: input.trackId,
          offerId: offer.id,
          offerVersion: offer.version,
          kind: input.kind,
          parentPurchaseId,
          requestSnapshot: brief,
          offerSnapshot: snapshot,
          coverageSnapshot,
          requestHash,
          logicalIntentKey,
          coverageHash: sha256Hex(coverageSnapshot),
          idempotencyKey,
          status,
          priceBaseUnits: offer.amountBaseUnits,
          termDays: brief.termDays,
          network: offer.network,
          assetContractId: offer.assetContractId,
          assetDecimals: offer.assetDecimals,
          payeeAddress: offer.payeeAddress,
          quoteExpiresAt,
        })
        .returning();

      if (status === "refused") {
        const refusal = await insertRefusal(tx, {
          ownerId: input.ownerId,
          projectId: input.projectId,
          purchaseId: purchase.id,
          reasonCode: reasons[0]?.code ?? "REFUSED",
          safeExplanation: reasons.map(reason => reason.message).join(" ") || "The request was refused.",
          now,
        });
        return { outcome: "refused", purchase, refusal, reasons };
      }

      return { outcome: "quoted", purchase };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [existingByKey] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.ownerId, input.ownerId), eq(purchases.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (existingByKey) {
      if (existingByKey.requestHash !== requestHash) {
        throw new RepositoryError("IDEMPOTENCY_KEY_REUSED", "This idempotency key belongs to a different request.", 409);
      }
      if (existingByKey.status === "refused") {
        const [refusal] = await db
          .select()
          .from(refusals)
          .where(eq(refusals.purchaseId, existingByKey.id))
          .orderBy(desc(refusals.createdAt))
          .limit(1);
        if (refusal) {
          return {
            outcome: "refused",
            purchase: existingByKey,
            refusal,
            reasons: [{ code: refusal.reasonCode, message: refusal.safeExplanation }],
          };
        }
      }
      return { outcome: "reused", purchase: existingByKey };
    }
    const [existingByIntent] = await db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.ownerId, input.ownerId),
          eq(purchases.logicalIntentKey, logicalIntentKey),
          inArray(purchases.status, [...activeIntentStatuses]),
        ),
      )
      .orderBy(desc(purchases.createdAt))
      .limit(1);
    if (existingByIntent) return { outcome: "reused", purchase: existingByIntent };
    throw new RepositoryError("QUOTE_CONFLICT", "A competing quote already exists for this intent.", 409);
  }
}

export async function approvePurchase(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string; approvingHuman: string; now?: Date },
): Promise<ApprovalOutcome> {
  const now = input.now ?? new Date();
  const approvingHuman = z.string().min(1).max(200).parse(input.approvingHuman);
  try {
    return await db.transaction(async tx => {
      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
        .for("update");
      if (!purchase) throw notFound();

      if (purchase.status === "approved") {
        const [approval] = await tx
          .select()
          .from(approvals)
          .where(and(eq(approvals.purchaseId, purchase.id), isNull(approvals.consumedAttemptId)))
          .limit(1);
        if (approval) return { outcome: "approved", purchase, approval };
        throw new RepositoryError("APPROVAL_ALREADY_CONSUMED", "This purchase has no unconsumed approval.", 409);
      }

      if (purchase.status !== "quoted") {
        throw new RepositoryError("PURCHASE_NOT_AWAITING_APPROVAL", "Only a quoted purchase can be approved.", 409);
      }
      if (purchase.quoteExpiresAt <= now) {
        const [expired] = await tx
          .update(purchases)
          .set({ status: "expired", updatedAt: now })
          .where(eq(purchases.id, purchase.id))
          .returning();
        return { outcome: "expired", purchase: expired };
      }
      if (!purchase.payeeAddress) {
        throw new RepositoryError("PAYEE_NOT_CONFIGURED", "This offer has no seller payee configured.", 422);
      }
      if (!isStellarPublicKey(purchase.payeeAddress)) {
        throw new RepositoryError("PAYEE_INVALID", "The seller payee is not a valid Stellar public key.", 422);
      }

      const fingerprint = purchaseFingerprint(purchase);
      const [existingApproval] = await tx
        .select()
        .from(approvals)
        .where(and(eq(approvals.purchaseId, purchase.id), isNull(approvals.consumedAttemptId)))
        .limit(1);
      if (existingApproval) {
        if (existingApproval.fingerprint !== fingerprint) {
          throw new RepositoryError("APPROVAL_FINGERPRINT_CONFLICT", "An approval is already bound to different quote terms.", 409);
        }
        if (purchase.approvalFingerprint === fingerprint && purchase.approvedAt) {
          return { outcome: "approved", purchase, approval: existingApproval };
        }
        const [approved] = await tx
          .update(purchases)
          .set({ status: "approved", approvalFingerprint: fingerprint, approvedAt: now, updatedAt: now })
          .where(eq(purchases.id, purchase.id))
          .returning();
        return { outcome: "approved", purchase: approved, approval: existingApproval };
      }

      const [approval] = await tx
        .insert(approvals)
        .values({
          id: randomId("apr"),
          purchaseId: purchase.id,
          approvingHuman,
          fingerprint,
          expiresAt: purchase.quoteExpiresAt,
        })
        .returning();
      const [approved] = await tx
        .update(purchases)
        .set({ status: "approved", approvalFingerprint: fingerprint, approvedAt: now, updatedAt: now })
        .where(eq(purchases.id, purchase.id))
        .returning();
      return { outcome: "approved", purchase: approved, approval };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
      .limit(1);
    if (purchase?.status === "approved") {
      const [approval] = await db
        .select()
        .from(approvals)
        .where(and(eq(approvals.purchaseId, purchase.id), isNull(approvals.consumedAttemptId)))
        .limit(1);
      if (approval) return { outcome: "approved", purchase, approval };
    }
    throw new RepositoryError("APPROVAL_CONFLICT", "A competing approval already exists.", 409);
  }
}

export async function claimAttemptAndReserve(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string; now?: Date },
): Promise<ReserveOutcome> {
  const now = input.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + 2 * 60 * 1000);

  try {
    return await db.transaction(async tx => {
      const [snapshot] = await tx
        .select({ projectId: purchases.projectId })
        .from(purchases)
        .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
        .limit(1);
      if (!snapshot) throw notFound();

      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, snapshot.projectId), eq(projects.ownerId, input.ownerId)))
        .for("update");
      if (!project) throw notFound();

      const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, input.purchaseId)).for("update");
      if (!purchase) throw notFound();

      if (purchase.status === "reserved" || purchase.status === "payment_pending") {
        throw new RepositoryError("PAYMENT_IN_PROGRESS", "This purchase already has an active payment attempt.", 409);
      }
      if (isSettledStatus(purchase.status)) {
        throw new RepositoryError("PURCHASE_ALREADY_SETTLED", "This purchase is already settled.", 409);
      }
      if (purchase.status !== "approved") {
        throw new RepositoryError("PURCHASE_NOT_APPROVABLE", "This purchase is not in an approvable state.", 409);
      }

      const fingerprint = purchaseFingerprint(purchase);
      if (!purchase.approvalFingerprint || purchase.approvalFingerprint !== fingerprint) {
        throw new RepositoryError("APPROVAL_STALE", "The approval does not match the immutable quote.", 409);
      }

      const [approval] = await tx
        .select()
        .from(approvals)
        .where(and(eq(approvals.purchaseId, purchase.id), isNull(approvals.consumedAttemptId)))
        .limit(1);
      if (!approval) throw new RepositoryError("APPROVAL_REQUIRED", "A human approval is required before reserving budget.", 409);
      if (approval.fingerprint !== purchase.approvalFingerprint) {
        throw new RepositoryError("APPROVAL_STALE", "The approval does not match the immutable quote.", 409);
      }
      if (approval.expiresAt <= now) {
        const [expired] = await tx
          .update(purchases)
          .set({ status: "expired", updatedAt: now })
          .where(eq(purchases.id, purchase.id))
          .returning();
        return { outcome: "expired", purchase: expired, reasonCode: "APPROVAL_EXPIRED" };
      }

      const [offer] = await tx
        .select()
        .from(offers)
        .where(and(eq(offers.id, purchase.offerId), eq(offers.version, purchase.offerVersion)))
        .limit(1);
      if (!offer || !offer.active || offer.activeFrom > now || (offer.expiresAt !== null && offer.expiresAt <= now)) {
        const [expired] = await tx
          .update(purchases)
          .set({ status: "expired", updatedAt: now })
          .where(eq(purchases.id, purchase.id))
          .returning();
        return { outcome: "expired", purchase: expired, reasonCode: "OFFER_INACTIVE" };
      }
      if (
        offer.amountBaseUnits !== purchase.priceBaseUnits ||
        offer.network !== purchase.network ||
        offer.assetContractId !== purchase.assetContractId ||
        offer.payeeAddress !== purchase.payeeAddress
      ) {
        const [expired] = await tx
          .update(purchases)
          .set({ status: "expired", updatedAt: now })
          .where(eq(purchases.id, purchase.id))
          .returning();
        return { outcome: "expired", purchase: expired, reasonCode: "OFFER_CHANGED" };
      }

      const confirmedSpend = await settledSpend(tx, project.id);
      const activeReservations = await activeReservationTotal(tx, project.id);
      const adjustments = await adjustmentTotal(tx, project.id);
      const available = project.budgetBaseUnits - adjustments - confirmedSpend - activeReservations;
      const availableBaseUnits = (available > 0n ? available : 0n).toString();

      if (purchase.priceBaseUnits > project.purchaseCapBaseUnits) {
        const reason = "The quoted price exceeds this project's purchase cap.";
        const refused = await refusePurchase(tx, purchase, "PURCHASE_CAP_EXCEEDED", reason, now);
        return {
          outcome: "refused",
          purchase: refused.purchase,
          refusal: refused.refusal,
          reasons: [{ code: "PURCHASE_CAP_EXCEEDED", message: reason }],
          availableBaseUnits,
        };
      }
      if (purchase.priceBaseUnits > available) {
        const reason =
          "The quoted price exceeds the project's available budget after confirmed spend, adjustments, and active reservations.";
        const refused = await refusePurchase(tx, purchase, "PROJECT_BUDGET_EXCEEDED", reason, now);
        return {
          outcome: "refused",
          purchase: refused.purchase,
          refusal: refused.refusal,
          reasons: [{ code: "PROJECT_BUDGET_EXCEEDED", message: reason }],
          availableBaseUnits,
        };
      }

      const [maxAttempt] = await tx
        .select({ value: sql<number>`coalesce(max(${paymentAttempts.attemptNumber}), 0)` })
        .from(paymentAttempts)
        .where(eq(paymentAttempts.purchaseId, purchase.id));
      const attemptNumber = Number(maxAttempt?.value ?? 0) + 1;
      const requirementsDigest = sha256Hex({
        purchaseId: purchase.id,
        priceBaseUnits: purchase.priceBaseUnits.toString(),
        network: purchase.network,
        assetContractId: purchase.assetContractId,
        payeeAddress: purchase.payeeAddress,
        approvalFingerprint: purchase.approvalFingerprint,
        quoteExpiresAt: purchase.quoteExpiresAt.toISOString(),
      });

      const [attempt] = await tx
        .insert(paymentAttempts)
        .values({
          id: randomId("att"),
          purchaseId: purchase.id,
          attemptNumber,
          requirementsDigest,
          phase: "created",
          reconciliationState: "not_started",
        })
        .returning();

      const consumed = await tx
        .update(approvals)
        .set({ consumedAttemptId: attempt.id, consumedAt: now })
        .where(and(eq(approvals.id, approval.id), isNull(approvals.consumedAttemptId)))
        .returning({ id: approvals.id });
      if (consumed.length !== 1) {
        throw new RepositoryError("APPROVAL_ALREADY_CONSUMED", "This approval was consumed by another attempt.", 409);
      }

      const [reservation] = await tx
        .insert(reservations)
        .values({
          id: randomId("res"),
          purchaseId: purchase.id,
          attemptId: attempt.id,
          projectId: project.id,
          amountBaseUnits: purchase.priceBaseUnits,
          state: "active",
          leaseExpiresAt,
        })
        .returning();

      const [reservedPurchase] = await tx
        .update(purchases)
        .set({ status: "reserved", updatedAt: now })
        .where(eq(purchases.id, purchase.id))
        .returning();

      return {
        outcome: "reserved",
        purchase: reservedPurchase,
        attempt,
        reservation,
        availableBaseUnits: (available - purchase.priceBaseUnits).toString(),
      };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
      .limit(1);
    if (purchase && (purchase.status === "reserved" || purchase.status === "payment_pending")) {
      throw new RepositoryError("PAYMENT_IN_PROGRESS", "This purchase already has an active payment attempt.", 409);
    }
    throw new RepositoryError("RESERVATION_CONFLICT", "A competing reservation or approval consumption won.", 409);
  }
}

function validateOfferStillMatchesPurchase(offer: OfferRow | undefined, purchase: PurchaseRow, now: Date): boolean {
  return Boolean(
    offer &&
      offer.active &&
      offer.activeFrom <= now &&
      (offer.expiresAt === null || offer.expiresAt > now) &&
      offer.amountBaseUnits === purchase.priceBaseUnits &&
      offer.network === purchase.network &&
      offer.assetContractId === purchase.assetContractId &&
      offer.payeeAddress === purchase.payeeAddress,
  );
}

export async function markSigningStarted(
  db: GrantDatabase,
  input: {
    ownerId: string;
    purchaseId: string;
    attemptId: string;
    authorizationDigest?: string | null;
    nonce?: string | null;
    authorizationValidUntil?: Date | null;
    now?: Date;
  },
): Promise<SigningStartOutcome> {
  const now = input.now ?? new Date();
  const authorizationDigest = input.authorizationDigest
    ? z.string().regex(/^[0-9a-f]{64}$/, "Use a lowercase SHA-256 hexadecimal digest.").parse(input.authorizationDigest)
    : null;
  if (authorizationDigest && !input.authorizationValidUntil) {
    throw new RepositoryError("INVALID_AUTHORIZATION", "A persisted authorization requires a validity end time.", 400);
  }

  try {
    return await db.transaction(async tx => {
      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
        .for("update");
      if (!purchase) throw notFound();

      const [attempt] = await tx
        .select()
        .from(paymentAttempts)
        .where(and(eq(paymentAttempts.id, input.attemptId), eq(paymentAttempts.purchaseId, purchase.id)))
        .limit(1);
      if (!attempt) throw notFound("The payment attempt was not found for this purchase.");
      const [reservation] = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.attemptId, attempt.id))
        .limit(1);
      if (!reservation) throw new RepositoryError("RESERVATION_REQUIRED", "The payment attempt has no reservation.", 409);

      if (attempt.phase === "signing_started" && purchase.status === "payment_pending") {
        return { outcome: "signing_started", purchase, attempt, reservation };
      }
      if (attempt.phase !== "created") {
        throw new RepositoryError("ATTEMPT_PHASE_CONFLICT", "Only a newly created attempt can begin signing.", 409);
      }
      if (purchase.status !== "reserved") {
        throw new RepositoryError("PURCHASE_NOT_RESERVED", "The purchase is not reserved for this attempt.", 409);
      }

      const [approval] = await tx
        .select()
        .from(approvals)
        .where(eq(approvals.consumedAttemptId, attempt.id))
        .limit(1);
      if (!approval || approval.fingerprint !== purchase.approvalFingerprint) {
        throw new RepositoryError("APPROVAL_STALE", "The consumed approval does not match the immutable quote.", 409);
      }

      const [offer] = await tx
        .select()
        .from(offers)
        .where(and(eq(offers.id, purchase.offerId), eq(offers.version, purchase.offerVersion)))
        .limit(1);

      if (approval.expiresAt <= now || !validateOfferStillMatchesPurchase(offer, purchase, now)) {
        const reasonCode = approval.expiresAt <= now ? "APPROVAL_EXPIRED" : offer ? "OFFER_CHANGED" : "OFFER_INACTIVE";
        const [releasedReservation] = await tx
          .update(reservations)
          .set({ state: "released", releasedAt: now })
          .where(eq(reservations.id, reservation.id))
          .returning();
        const [releasedAttempt] = await tx
          .update(paymentAttempts)
          .set({ phase: "no_settlement_verified", reconciliationState: "no_settlement", reconciledAt: now })
          .where(eq(paymentAttempts.id, attempt.id))
          .returning();
        const [expiredPurchase] = await tx
          .update(purchases)
          .set({ status: "expired", updatedAt: now })
          .where(eq(purchases.id, purchase.id))
          .returning();
        return {
          outcome: "expired",
          purchase: expiredPurchase,
          attempt: releasedAttempt,
          reservation: releasedReservation,
          reasonCode,
        };
      }

      const [signingAttempt] = await tx
        .update(paymentAttempts)
        .set({
          phase: "signing_started",
          signingStartedAt: now,
          authorizationDigest,
          nonce: input.nonce ?? null,
          authorizationValidUntil: input.authorizationValidUntil ?? null,
        })
        .where(eq(paymentAttempts.id, attempt.id))
        .returning();
      const [pendingPurchase] = await tx
        .update(purchases)
        .set({ status: "payment_pending", updatedAt: now })
        .where(eq(purchases.id, purchase.id))
        .returning();
      return { outcome: "signing_started", purchase: pendingPurchase, attempt: signingAttempt, reservation };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    throw new RepositoryError("AUTHORIZATION_ALREADY_USED", "This authorization digest is already bound to another attempt.", 409);
  }
}

export async function releaseUnsignedReservation(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string; attemptId: string; now?: Date },
): Promise<ReleaseOutcome> {
  const now = input.now ?? new Date();
  return db.transaction(async tx => {
    const [purchase] = await tx
      .select()
      .from(purchases)
      .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
      .for("update");
    if (!purchase) throw notFound();
    const [attempt] = await tx
      .select()
      .from(paymentAttempts)
      .where(and(eq(paymentAttempts.id, input.attemptId), eq(paymentAttempts.purchaseId, purchase.id)))
      .limit(1);
    if (!attempt) throw notFound("The payment attempt was not found for this purchase.");
    const [reservation] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.attemptId, attempt.id))
      .limit(1);
    if (!reservation) throw new RepositoryError("RESERVATION_REQUIRED", "The payment attempt has no reservation.", 409);

    if (attempt.phase === "no_settlement_verified" && reservation.state === "released") {
      return { outcome: "released", purchase, attempt, reservation };
    }
    if (attempt.phase !== "created") {
      throw new RepositoryError(
        "SIGNING_MAY_HAVE_OCCURRED",
        "This attempt reached the signing marker. Its reservation must remain held until reconciliation.",
        409,
      );
    }

    const [releasedReservation] = await tx
      .update(reservations)
      .set({ state: "released", releasedAt: now })
      .where(eq(reservations.id, reservation.id))
      .returning();
    const [releasedAttempt] = await tx
      .update(paymentAttempts)
      .set({ phase: "no_settlement_verified", reconciliationState: "no_settlement", reconciledAt: now })
      .where(eq(paymentAttempts.id, attempt.id))
      .returning();
    const [releasedPurchase] = await tx
      .update(purchases)
      .set({ status: "failed_no_settlement", updatedAt: now })
      .where(eq(purchases.id, purchase.id))
      .returning();
    return {
      outcome: "released",
      purchase: releasedPurchase,
      attempt: releasedAttempt,
      reservation: releasedReservation,
    };
  });
}

export async function finalizeSettlement(
  db: GrantDatabase,
  input: FinalizeSettlementInput,
): Promise<FinalizeSettlementOutcome> {
  const amountBaseUnits = parsePositiveAmountBaseUnits(input.amountBaseUnits);
  const transactionHash = z.string().regex(/^[0-9a-f]{64}$/, "Use a lowercase Stellar transaction hash.").parse(input.transactionHash);
  const settlementReference = z.string().min(1).max(300).parse(input.settlementReference);
  const verificationSource = z.string().min(1).max(200).parse(input.verificationSource);
  const authorizationDigest = input.authorizationDigest
    ? z.string().regex(/^[0-9a-f]{64}$/, "Use a lowercase SHA-256 hexadecimal digest.").parse(input.authorizationDigest)
    : null;
  const verifiedAt = input.verifiedAt ?? new Date();

  try {
    return await db.transaction(async tx => {
      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
        .for("update");
      if (!purchase) throw notFound();
      const [attempt] = await tx
        .select()
        .from(paymentAttempts)
        .where(and(eq(paymentAttempts.id, input.attemptId), eq(paymentAttempts.purchaseId, purchase.id)))
        .limit(1);
      if (!attempt) throw notFound("The payment attempt was not found for this purchase.");
      const [reservation] = await tx
        .select()
        .from(reservations)
        .where(eq(reservations.attemptId, attempt.id))
        .limit(1);
      if (!reservation) throw new RepositoryError("RESERVATION_REQUIRED", "The payment attempt has no reservation.", 409);

      const [existingReceipt] = await tx
        .select()
        .from(receipts)
        .where(eq(receipts.attemptId, attempt.id))
        .limit(1);
      if (existingReceipt) {
        if (existingReceipt.transactionHash === transactionHash && existingReceipt.settlementReference === settlementReference) {
          const [license] = await tx.select().from(licenses).where(eq(licenses.purchaseId, purchase.id)).limit(1);
          if (!license) throw new RepositoryError("LICENSE_MISSING", "The receipt has no matching license.", 409);
          return { outcome: "settled", purchase, receipt: existingReceipt, license, idempotent: true };
        }
        throw new RepositoryError("RECEIPT_CONFLICT", "This attempt already has a different verified receipt.", 409);
      }

      if (isSettledStatus(purchase.status)) {
        const [receipt] = await tx.select().from(receipts).where(eq(receipts.purchaseId, purchase.id)).limit(1);
        if (receipt && receipt.transactionHash === transactionHash && receipt.settlementReference === settlementReference) {
          const [license] = await tx.select().from(licenses).where(eq(licenses.purchaseId, purchase.id)).limit(1);
          if (!license) throw new RepositoryError("LICENSE_MISSING", "The receipt has no matching license.", 409);
          return { outcome: "settled", purchase, receipt, license, idempotent: true };
        }
        throw new RepositoryError("PURCHASE_ALREADY_SETTLED", "This purchase already has a settled receipt.", 409);
      }

      if (purchase.status !== "reserved" && purchase.status !== "payment_pending") {
        throw new RepositoryError("PURCHASE_NOT_PAYABLE", "Only a reserved or pending purchase can be settled.", 409);
      }
      if (reservation.state !== "active") {
        throw new RepositoryError("RESERVATION_NOT_ACTIVE", "The reservation is not active for this settlement.", 409);
      }
      if (
        amountBaseUnits !== purchase.priceBaseUnits ||
        input.network !== purchase.network ||
        input.assetContractId !== purchase.assetContractId ||
        input.payeeAddress !== purchase.payeeAddress
      ) {
        throw new RepositoryError("SETTLEMENT_MISMATCH", "Verified settlement details do not match the immutable quote.", 409);
      }
      if (attempt.phase !== "signing_started" && attempt.phase !== "submitted" && attempt.phase !== "uncertain") {
        throw new RepositoryError("ATTEMPT_NOT_SUBMITTED", "Settlement cannot be finalized before a signing marker exists.", 409);
      }
      if (attempt.authorizationDigest && authorizationDigest && attempt.authorizationDigest !== authorizationDigest) {
        throw new RepositoryError("AUTHORIZATION_MISMATCH", "The settlement authorization differs from the recorded attempt.", 409);
      }
      if (attempt.transactionHash && attempt.transactionHash !== transactionHash) {
        throw new RepositoryError("TRANSACTION_MISMATCH", "The settlement transaction differs from the recorded attempt.", 409);
      }

      let parentLicense: LicenseRow | undefined;
      let endsAt: Date;
      if (purchase.kind === "addon") {
        if (!purchase.parentPurchaseId) {
          throw new RepositoryError("PARENT_PURCHASE_REQUIRED", "An add-on license requires a parent purchase.", 409);
        }
        [parentLicense] = await tx.select().from(licenses).where(eq(licenses.purchaseId, purchase.parentPurchaseId)).limit(1);
        if (!parentLicense) throw new RepositoryError("PARENT_LICENSE_MISSING", "The parent license was not found.", 409);
        if (parentLicense.projectId !== purchase.projectId || parentLicense.trackId !== purchase.trackId) {
          throw new RepositoryError("PARENT_LICENSE_MISMATCH", "The parent license belongs to another project or track.", 409);
        }
        if (parentLicense.endsAt <= verifiedAt) {
          throw new RepositoryError("PARENT_LICENSE_EXPIRED", "The parent license has already expired.", 409);
        }
        endsAt = parentLicense.endsAt;
      } else {
        endsAt = new Date(verifiedAt.getTime() + purchase.termDays * 86_400_000);
      }

      const [license] = await tx
        .insert(licenses)
        .values({
          id: randomId("lic"),
          purchaseId: purchase.id,
          projectId: purchase.projectId,
          trackId: purchase.trackId,
          kind: purchase.kind,
          parentLicenseId: parentLicense?.id ?? null,
          licenseNumber: `GRANT-${verifiedAt.getUTCFullYear()}-${randomId("n").slice(-10).toUpperCase()}`,
          coverageSnapshot: purchase.coverageSnapshot,
          coverageHash: purchase.coverageHash,
          startsAt: verifiedAt,
          endsAt,
        })
        .returning();

      const [receipt] = await tx
        .insert(receipts)
        .values({
          id: randomId("rcp"),
          attemptId: attempt.id,
          purchaseId: purchase.id,
          licenseId: license.id,
          network: purchase.network,
          assetContractId: purchase.assetContractId,
          payeeAddress: input.payeeAddress,
          amountBaseUnits: purchase.priceBaseUnits,
          transactionHash,
          settlementReference,
          authorizationDigest: authorizationDigest ?? attempt.authorizationDigest,
          ledger: input.ledger ?? null,
          verificationSource,
          safeMetadata: input.safeMetadata ?? {},
          verifiedAt,
        })
        .returning();

      const [settledPurchase] = await tx
        .update(purchases)
        .set({ status: "settled", settledAt: verifiedAt, updatedAt: verifiedAt })
        .where(eq(purchases.id, purchase.id))
        .returning();
      await tx
        .update(reservations)
        .set({ state: "settled", settledAt: verifiedAt })
        .where(eq(reservations.id, reservation.id));
      await tx
        .update(paymentAttempts)
        .set({
          phase: "settled_verified",
          reconciliationState: "settled",
          transactionHash,
          providerReference: attempt.providerReference ?? settlementReference,
          reconciledAt: verifiedAt,
        })
        .where(eq(paymentAttempts.id, attempt.id));

      return { outcome: "settled", purchase: settledPurchase, receipt, license, idempotent: false };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.attemptId, input.attemptId))
      .limit(1);
    if (existingReceipt && existingReceipt.transactionHash === transactionHash && existingReceipt.settlementReference === settlementReference) {
      const [purchase] = await db.select().from(purchases).where(eq(purchases.id, input.purchaseId)).limit(1);
      const [license] = await db.select().from(licenses).where(eq(licenses.purchaseId, input.purchaseId)).limit(1);
      if (purchase && license) return { outcome: "settled", purchase, receipt: existingReceipt, license, idempotent: true };
    }
    throw new RepositoryError("SETTLEMENT_REFERENCE_REUSED", "This transaction or settlement reference is already bound.", 409);
  }
}

export async function getPurchaseForOwner(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string },
): Promise<PurchaseView> {
  const [purchase] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.id, input.purchaseId), eq(purchases.ownerId, input.ownerId)))
    .limit(1);
  if (!purchase) throw notFound();

  const [approvalRows, reservationRows, attemptRows, receiptRows, licenseRows, refusalRows] = await Promise.all([
    db.select().from(approvals).where(eq(approvals.purchaseId, purchase.id)).orderBy(desc(approvals.createdAt)).limit(1),
    db.select().from(reservations).where(eq(reservations.purchaseId, purchase.id)).orderBy(desc(reservations.createdAt)).limit(1),
    db.select().from(paymentAttempts).where(eq(paymentAttempts.purchaseId, purchase.id)).orderBy(paymentAttempts.attemptNumber),
    db.select().from(receipts).where(eq(receipts.purchaseId, purchase.id)).limit(1),
    db.select().from(licenses).where(eq(licenses.purchaseId, purchase.id)).limit(1),
    db.select().from(refusals).where(eq(refusals.purchaseId, purchase.id)).orderBy(desc(refusals.createdAt)).limit(1),
  ]);

  const license = licenseRows[0] ?? null;
  const artifactRows = license
    ? await db.select().from(artifacts).where(eq(artifacts.licenseId, license.id)).orderBy(desc(artifacts.generationVersion))
    : [];

  return {
    purchase,
    approval: approvalRows[0] ?? null,
    reservation: reservationRows[0] ?? null,
    attempts: attemptRows,
    receipt: receiptRows[0] ?? null,
    license,
    artifacts: artifactRows,
    refusal: refusalRows[0] ?? null,
  };
}


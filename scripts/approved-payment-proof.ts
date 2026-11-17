import fs from "node:fs";
import { eq } from "drizzle-orm";
import { createDatabase, resolveDatabaseUrl } from "../lib/db/client";
import { randomId } from "../lib/db/crypto";
import {
  approvePurchase,
  claimAttemptAndReserve,
  createProject,
  markSigningStarted,
  quotePurchase,
} from "../lib/db/repositories";
import {
  approvals,
  paymentAttempts,
  projects,
  purchases,
  reservations,
  user,
} from "../lib/db/schema";
import type { Brief } from "../lib/licensing/schema";

const base = process.env.APP_ORIGIN ?? "http://localhost:3000";
const evidencePath = "agent-state/approved-payment-evidence.json";
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

const database = createDatabase(resolveDatabaseUrl(process.env, "DATABASE_URL"));

function cookieFrom(response: Response): string {
  const values = response.headers.getSetCookie?.() ?? [];
  return values.map(value => value.split(";")[0]).filter(Boolean).join("; ");
}

async function authRequest(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(body),
  });
  return { status: response.status, cookie: cookieFrom(response), body: await response.json().catch(() => ({})) };
}

async function jsonRequest(path: string, cookie: string, body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json", origin: base }),
      cookie,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function pendingReconcileProof(cookie: string, ownerId: string) {
  const project = await createProject(database.db, {
    ownerId,
    clientPrivateName: "Pending Reconcile Client",
    publicDisplayLabel: "Pending Reconcile Project",
    brief,
  });
  const quote = await quotePurchase(database.db, {
    ownerId,
    projectId: project.id,
    trackId: "morning-edit",
    offerId: "morning-edit-testnet-base",
    offerVersion: 1,
    kind: "base",
    briefVersion: project.briefVersion,
    request: brief,
    idempotencyKey: randomId("key"),
  });
  if (quote.outcome !== "quoted" || !quote.purchase) throw new Error(`Pending quote failed: ${quote.outcome}.`);
  const approval = await approvePurchase(database.db, {
    ownerId,
    purchaseId: quote.purchase.id,
    approvingHuman: "approved_payment_proof",
  });
  if (approval.outcome !== "approved") throw new Error(`Pending approval failed: ${approval.outcome}.`);
  const reserved = await claimAttemptAndReserve(database.db, { ownerId, purchaseId: quote.purchase.id });
  if (reserved.outcome !== "reserved") throw new Error(`Pending reservation failed: ${reserved.outcome}.`);
  const signing = await markSigningStarted(database.db, {
    ownerId,
    purchaseId: quote.purchase.id,
    attemptId: reserved.attempt.id,
  });
  if (signing.outcome !== "signing_started") throw new Error(`Pending signing failed: ${signing.outcome}.`);

  const reconcile = await jsonRequest(`/api/purchases/${quote.purchase.id}/reconcile`, cookie, {});
  const result = {
    status: reconcile.status,
    code: String(reconcile.body.code ?? "UNKNOWN"),
    purchaseId: quote.purchase.id,
    attemptId: reserved.attempt.id,
  };

  await database.db.delete(reservations).where(eq(reservations.purchaseId, quote.purchase.id));
  await database.db.delete(approvals).where(eq(approvals.purchaseId, quote.purchase.id));
  await database.db.delete(paymentAttempts).where(eq(paymentAttempts.purchaseId, quote.purchase.id));
  await database.db.delete(purchases).where(eq(purchases.id, quote.purchase.id));
  await database.db.delete(projects).where(eq(projects.id, project.id));

  return result;
}

async function main() {
  const email = process.env.DEMO_TEST_EMAIL;
  const password = process.env.DEMO_TEST_PASSWORD;
  if (!email || !password) throw new Error("Demo credentials are not configured.");

  const [owner] = await database.db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!owner) throw new Error("The demo owner does not exist.");

  const signIn = await authRequest("/api/auth/sign-in/email", { email, password });
  if (signIn.status !== 200 || !signIn.cookie) throw new Error(`Sign-in failed with ${signIn.status}.`);
  const cookie = signIn.cookie;

  const create = await jsonRequest("/api/projects", cookie, {
    clientPrivateName: "Approved Payment Client",
    publicDisplayLabel: "Approved Payment Project",
    brief,
  });
  if (create.status !== 201 || !create.body.project?.id) throw new Error(`Project create failed: ${create.status}.`);
  const projectId = create.body.project.id as string;

  const quote = await jsonRequest(`/api/projects/${projectId}/quotes`, cookie, {
    trackId: "morning-edit",
    offerId: "morning-edit-testnet-base",
    offerVersion: 1,
    kind: "base",
    idempotencyKey: randomId("key"),
  });
  if (quote.status !== 201 || !quote.body.purchase?.id) throw new Error(`Quote failed: ${quote.status}.`);
  const purchaseId = quote.body.purchase.id as string;

  const approve = await jsonRequest(`/api/purchases/${purchaseId}/approve`, cookie, {});
  if (approve.status !== 200 || approve.body.outcome !== "approved") throw new Error(`Approval failed: ${approve.status}.`);

  const pay = await jsonRequest(`/api/purchases/${purchaseId}/pay`, cookie, {});
  if (pay.status !== 200 || pay.body.outcome !== "settled") {
    const failure = { status: pay.status, body: pay.body };
    fs.writeFileSync(evidencePath, JSON.stringify({ status: "failed", checkedAt: new Date().toISOString(), failure }, null, 2) + "\n");
    throw new Error(`Payment did not settle: ${pay.status} ${JSON.stringify(pay.body).slice(0, 500)}`);
  }

  const status = await jsonRequest(`/api/purchases/${purchaseId}`, cookie);
  const settledReconcile = await jsonRequest(`/api/purchases/${purchaseId}/reconcile`, cookie, {});
  const pending = await pendingReconcileProof(cookie, owner.id);

  const attempt = status.body.attempts?.at(-1);
  let settlementMetadata: Record<string, unknown> | null = null;
  if (attempt?.providerReference) {
    try {
      settlementMetadata = JSON.parse(attempt.providerReference);
    } catch {
      settlementMetadata = null;
    }
  }

  const receipt = pay.body.receipt;
  const license = pay.body.license;
  const evidence = {
    status: "confirmed",
    checkedAt: new Date().toISOString(),
    route: "local authenticated pay route -> Vercel Next.js x402 seller",
    projectId,
    purchaseId,
    licenseId: license?.id ?? null,
    licenseNumber: license?.licenseNumber ?? null,
    transactionHash: receipt?.transactionHash ?? null,
    ledger: receipt?.ledger ?? null,
    amountBaseUnits: receipt?.amountBaseUnits ?? null,
    network: receipt?.network ?? null,
    assetContractId: receipt?.assetContractId ?? null,
    payee: receipt?.payeeAddress ?? null,
    settlementMetadata,
    licenseEndsAt: license?.endsAt ?? null,
    reconcileSettled: { status: settledReconcile.status, code: settledReconcile.body.code ?? null },
    reconcilePending: pending,
    notes: [
      "The seller route is the deployed Next.js route on Vercel.",
      "The buyer orchestration ran locally because the testnet signer is not deployed.",
      "The pending reconcile fixture confirmed no new signature or attempt was created.",
    ],
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");

  console.log("Approved payment path confirmed.");
  console.log(`Purchase: ${purchaseId}`);
  console.log(`Transaction: ${evidence.transactionHash}`);
  console.log(`License: ${evidence.licenseNumber}`);
  console.log(`Settled reconcile: ${settledReconcile.status} ${settledReconcile.body.code ?? ""}`);
  console.log(`Pending reconcile: ${pending.status} ${pending.code}`);
  console.log(`Evidence written to ${evidencePath}`);
}

main()
  .catch(error => {
    console.error("Approved payment proof failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.close();
  });

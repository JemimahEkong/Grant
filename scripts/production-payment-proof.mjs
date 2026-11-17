import fs from "node:fs";

const base = "https://grant-roan.vercel.app";
const evidencePath = "agent-state/production-payment-evidence.json";
const horizonUrl = "https://horizon-testnet.stellar.org";

const env = new Map();
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env.set(match[1], match[2]);
}

const email = env.get("DEMO_TEST_EMAIL");
const password = env.get("DEMO_TEST_PASSWORD");
const buyerAddress = env.get("G0_BUYER_PUBLIC");
if (!email || !password || !buyerAddress) throw new Error("Production proof credentials are incomplete.");

const brief = {
  intendedUse: "organic",
  platforms: ["instagram", "tiktok"],
  territory: { worldwide: true, countries: [] },
  termDays: 90,
  clipDurationSeconds: 30,
  clientDelivery: true,
  reposting: false,
  futureCampaigns: false,
};

function cookieFrom(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  return values.map(value => value.split(";")[0]).filter(Boolean).join("; ");
}

async function authRequest(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(body),
  });
  return { status: response.status, cookie: cookieFrom(response), body: await response.json().catch(() => ({})) };
}

async function jsonRequest(path, cookie, body) {
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

async function usdcBalance(publicKey) {
  const response = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!response.ok) return null;
  const account = await response.json();
  return account.balances?.find(item => item.asset_code === "USDC")?.balance ?? "0";
}

async function main() {
  const signIn = await authRequest("/api/auth/sign-in/email", { email, password });
  if (signIn.status !== 200 || !signIn.cookie) throw new Error(`Production sign-in failed with ${signIn.status}.`);
  const cookie = signIn.cookie;
  const buyerBefore = await usdcBalance(buyerAddress);

  const create = await jsonRequest("/api/projects", cookie, {
    clientPrivateName: "Production Payment Client",
    publicDisplayLabel: "Production Payment Project",
    brief,
  });
  if (create.status !== 201 || !create.body.project?.id) throw new Error(`Project create failed: ${create.status}.`);
  const projectId = create.body.project.id;

  const quote = await jsonRequest(`/api/projects/${projectId}/quotes`, cookie, {
    trackId: "morning-edit",
    offerId: "morning-edit-testnet-base",
    offerVersion: 1,
    kind: "base",
    idempotencyKey: `prod-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  });
  if (quote.status !== 201 || !quote.body.purchase?.id) throw new Error(`Quote failed: ${quote.status}.`);
  const purchaseId = quote.body.purchase.id;

  const approve = await jsonRequest(`/api/purchases/${purchaseId}/approve`, cookie, {});
  if (approve.status !== 200 || approve.body.outcome !== "approved") throw new Error(`Approval failed: ${approve.status}.`);

  const pay = await jsonRequest(`/api/purchases/${purchaseId}/pay`, cookie, {});
  if (pay.status !== 200 || pay.body.outcome !== "settled") {
    fs.writeFileSync(
      evidencePath,
      JSON.stringify({ status: "failed", checkedAt: new Date().toISOString(), pay: { status: pay.status, body: pay.body } }, null, 2) + "\n",
    );
    throw new Error(`Production payment did not settle: ${pay.status} ${JSON.stringify(pay.body).slice(0, 500)}`);
  }

  const statusBeforeRepeat = await jsonRequest(`/api/purchases/${purchaseId}`, cookie);
  const buyerAfterFirst = await usdcBalance(buyerAddress);
  const repeat = await jsonRequest(`/api/purchases/${purchaseId}/pay`, cookie, {});
  const statusAfterRepeat = await jsonRequest(`/api/purchases/${purchaseId}`, cookie);
  const buyerAfterRepeat = await usdcBalance(buyerAddress);

  const receipt = pay.body.receipt;
  const license = pay.body.license;
  const reservation = statusBeforeRepeat.body.reservation;
  const attemptsBefore = statusBeforeRepeat.body.attempts?.length ?? 0;
  const attemptsAfter = statusAfterRepeat.body.attempts?.length ?? 0;

  const evidence = {
    status: "confirmed",
    checkedAt: new Date().toISOString(),
    route: `${base}/api/purchases/${purchaseId}/pay -> ${base}/api/x402/license`,
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
    buyerAddress,
    buyerBefore,
    buyerAfterFirst,
    buyerAfterRepeat,
    reservation: reservation ? { id: reservation.id, state: reservation.state, amountBaseUnits: reservation.amountBaseUnits } : null,
    receipt: receipt
      ? {
          id: receipt.id,
          transactionHash: receipt.transactionHash,
          settlementReference: receipt.settlementReference,
          verificationSource: receipt.verificationSource,
        }
      : null,
    licenseEndsAt: license?.endsAt ?? null,
    repeatPay: { status: repeat.status, code: repeat.body.code ?? null },
    attemptsBeforeRepeat: attemptsBefore,
    attemptsAfterRepeat: attemptsAfter,
    noSecondSignature: attemptsBefore === 1 && attemptsAfter === 1 && buyerAfterFirst === buyerAfterRepeat,
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");

  console.log("Production purchase confirmed.");
  console.log(`Purchase: ${purchaseId}`);
  console.log(`Transaction: ${evidence.transactionHash}`);
  console.log(`Ledger: ${evidence.ledger}`);
  console.log(`License: ${evidence.licenseNumber}`);
  console.log(`Buyer USDC: ${buyerBefore} -> ${buyerAfterFirst} -> ${buyerAfterRepeat}`);
  console.log(`Reservation: ${evidence.reservation?.state}`);
  console.log(`Repeat pay: ${repeat.status} ${evidence.repeatPay.code}`);
  console.log(`No second signature: ${evidence.noSecondSignature}`);
  console.log(`Evidence written to ${evidencePath}`);
}

main().catch(error => {
  console.error("Production payment proof failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

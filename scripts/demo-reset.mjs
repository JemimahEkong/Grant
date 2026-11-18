const base = (process.env.DEMO_RESET_BASE_URL ?? "https://grant-roan.vercel.app").replace(/\/$/, "");
const password = process.env.DEMO_RESET_PASSWORD ?? "GrantDemoReset2026!";
const stamp = Date.now();
const suffix = Math.random().toString(16).slice(2, 8);
const email = `demo-reset-${stamp}-${suffix}@grant.local`;

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

async function main() {
  const signUp = await authRequest("/api/auth/sign-up/email", {
    name: "Grant Demo Reset",
    email,
    password,
  });
  if (signUp.status !== 200 || !signUp.cookie) {
    throw new Error(`Demo sign-up failed with ${signUp.status}: ${JSON.stringify(signUp.body).slice(0, 300)}`);
  }
  const cookie = signUp.cookie;

  const wallet = await jsonRequest("/api/wallet", cookie, {});
  if (![200, 201].includes(wallet.status)) {
    throw new Error(`Wallet creation failed with ${wallet.status}: ${JSON.stringify(wallet.body).slice(0, 300)}`);
  }
  const activation = await jsonRequest("/api/wallet/activate", cookie, {});
  if (activation.status !== 200) {
    throw new Error(`Wallet activation failed with ${activation.status}: ${JSON.stringify(activation.body).slice(0, 300)}`);
  }
  const trustline = await jsonRequest("/api/wallet/trustline", cookie, {});
  if (trustline.status !== 200) {
    throw new Error(`Trustline failed with ${trustline.status}: ${JSON.stringify(trustline.body).slice(0, 300)}`);
  }
  const faucet = await jsonRequest("/api/wallet/faucet", cookie, {});
  if (faucet.status !== 200 || faucet.body.outcome !== "confirmed") {
    throw new Error(`Faucet failed with ${faucet.status}: ${JSON.stringify(faucet.body).slice(0, 300)}`);
  }

  let fundedView = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    fundedView = await jsonRequest("/api/wallet?refresh=1", cookie);
    if (fundedView.status === 200 && Number(fundedView.body.balance) >= 2) break;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  if (!fundedView || fundedView.status !== 200 || Number(fundedView.body.balance) < 2) {
    throw new Error(`Faucet funding was not visible to the app: ${JSON.stringify(fundedView?.body ?? {}).slice(0, 300)}`);
  }

  const project = await jsonRequest("/api/projects", cookie, {
    clientPrivateName: "Demo Reset Client",
    publicDisplayLabel: "Demo Reset Project",
    brief,
  });
  if (project.status !== 201 || !project.body.project?.id) {
    throw new Error(`Project creation failed with ${project.status}: ${JSON.stringify(project.body).slice(0, 300)}`);
  }

  const walletView = await jsonRequest("/api/wallet?refresh=1", cookie);
  const projectView = await jsonRequest(`/api/projects/${project.body.project.id}`, cookie);
  if (walletView.status !== 200 || projectView.status !== 200) {
    throw new Error("The reset account could not be read back.");
  }
  const budget = projectView.body.budget;
  if (
    projectView.body.purchases.length !== 0 ||
    budget.purchasesUsed !== 0 ||
    budget.confirmedSpendBaseUnits !== "0" ||
    budget.activeReservationsBaseUnits !== "0" ||
    budget.purchaseCountCap !== 2
  ) {
    throw new Error(`The reset project is not clean: ${JSON.stringify(budget)}`);
  }

  const available = BigInt(budget.availableBaseUnits);
  const budgetUsdc = `${available / 10_000_000n}.${(available % 10_000_000n).toString().padStart(7, "0").slice(0, 2)}`;
  console.log("Demo reset complete.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Wallet: ${walletView.body.address}`);
  console.log(`Balance: ${walletView.body.balance} USDC`);
  console.log(`Project: ${project.body.project.id}`);
  console.log(`Budget: ${budgetUsdc} USDC available, ${budget.purchasesUsed} of ${budget.purchaseCountCap} purchases used.`);
  console.log(`Faucet transaction: ${faucet.body.transactionHash}`);
  console.log(`Sign in: ${base}/signin`);
  console.log("Existing evidence was not modified. This command only created a new account and project.");
}

main().catch(error => {
  console.error("Demo reset failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

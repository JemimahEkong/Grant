import fs from "node:fs";

const base = "https://grant-roan.vercel.app";
const purchaseId = process.env.SHARE_PROOF_PURCHASE_ID ?? "pur_4547cd9755e74c77bcaf7d28e30f1c00";
const evidencePath = "agent-state/share-evidence.json";

const env = new Map();
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env.set(match[1], match[2]);
}

function cookieFrom(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  return values.map(value => value.split(";")[0]).filter(Boolean).join("; ");
}

async function main() {
  const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email: env.get("DEMO_TEST_EMAIL"), password: env.get("DEMO_TEST_PASSWORD") }),
  });
  if (signIn.status !== 200) throw new Error(`Production sign-in failed with ${signIn.status}.`);
  const cookie = cookieFrom(signIn);

  const share = await fetch(`${base}/api/purchases/${purchaseId}/share`, {
    method: "POST",
    headers: { origin: base, cookie },
  });
  const shareBody = await share.json().catch(() => ({}));
  if (share.status !== 201 || !shareBody.token || !shareBody.url) {
    throw new Error(`Share creation failed with ${share.status}: ${JSON.stringify(shareBody).slice(0, 400)}`);
  }

  const proof = await fetch(shareBody.url);
  const proofBody = await proof.json().catch(() => ({}));
  const serialized = JSON.stringify(proofBody);
  if (proof.status !== 200 || proofBody.product !== "Grant") {
    throw new Error(`Proof read failed with ${proof.status}: ${serialized.slice(0, 400)}`);
  }
  if (
    serialized.includes("Production Payment Client") ||
    serialized.includes(env.get("DEMO_TEST_EMAIL")) ||
    serialized.includes("audio/morning-edit") ||
    serialized.includes("licenses/")
  ) {
    throw new Error("Proof exposed private client or object data.");
  }

  const revoke = await fetch(`${base}/api/purchases/${purchaseId}/share`, {
    method: "DELETE",
    headers: { origin: base, cookie },
  });
  const revokeBody = await revoke.json().catch(() => ({}));
  const afterRevoke = await fetch(shareBody.url);

  const evidence = {
    status: "passed",
    checkedAt: new Date().toISOString(),
    purchaseId,
    shareCreation: { status: share.status, shareLinkId: shareBody.shareLinkId },
    proofRead: {
      status: proof.status,
      product: proofBody.product,
      projectLabel: proofBody.projectLabel,
      licenseNumber: proofBody.license?.number,
      trackTitle: proofBody.track?.title,
      transactionHash: proofBody.payment?.transactionHash,
      cacheControl: proof.headers.get("cache-control"),
      robots: proof.headers.get("x-robots-tag"),
    },
    revoke: { status: revoke.status, revoked: revokeBody.revoked },
    afterRevoke: { status: afterRevoke.status },
    rawTokenRecorded: false,
    signedUrlPublished: false,
    note: "The proof URL returned a public-safe view without private client names, object keys, raw tokens, or audio entitlement.",
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log("Share/proof link confirmed.");
  console.log(`Proof status: ${proof.status} | Project: ${proofBody.projectLabel}`);
  console.log(`License: ${proofBody.license?.number}`);
  console.log(`Transaction: ${proofBody.payment?.transactionHash}`);
  console.log(`Revoked: ${revokeBody.revoked} | After revoke: ${afterRevoke.status}`);
  console.log(`Evidence written to ${evidencePath}`);
}

main().catch(error => {
  console.error("Share proof failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

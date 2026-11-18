import { createHash } from "node:crypto";
import fs from "node:fs";

const base = "https://grant-roan.vercel.app";
const purchaseId = process.env.AUDIO_PROOF_PURCHASE_ID ?? "pur_4547cd9755e74c77bcaf7d28e30f1c00";
const evidencePath = "agent-state/audio-evidence.json";

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

  const delivery = await fetch(`${base}/api/purchases/${purchaseId}/delivery/retry`, {
    method: "POST",
    headers: { origin: base, cookie },
  });
  const deliveryBody = await delivery.json().catch(() => ({}));
  if (![200, 201].includes(delivery.status) || !deliveryBody.audio?.artifact?.id) {
    throw new Error(`Audio delivery failed with ${delivery.status}: ${JSON.stringify(deliveryBody).slice(0, 500)}`);
  }

  const download = await fetch(`${base}/api/purchases/${purchaseId}/download?asset=audio`, { headers: { cookie } });
  const downloadBody = await download.json().catch(() => ({}));
  if (download.status !== 200 || !downloadBody.url) {
    throw new Error(`Audio download URL failed with ${download.status}: ${JSON.stringify(downloadBody).slice(0, 400)}`);
  }

  const object = await fetch(downloadBody.url);
  if (!object.ok) throw new Error(`Presigned audio download failed with ${object.status}.`);
  const bytes = Buffer.from(await object.arrayBuffer());
  const isMp3 = bytes.subarray(0, 3).toString("ascii") === "ID3" || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0);
  if (!isMp3) {
    throw new Error("Downloaded object is not an MP3 file.");
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const anonymous = await fetch(`${base}/api/purchases/${purchaseId}/download?asset=audio`);

  const evidence = {
    status: "passed",
    checkedAt: new Date().toISOString(),
    purchaseId,
    artifactId: deliveryBody.audio.artifact.id,
    artifactKind: deliveryBody.audio.artifact.kind,
    objectKey: deliveryBody.audio.artifact.objectKey,
    contentHash: deliveryBody.audio.artifact.contentHash,
    downloadedBytes: bytes.byteLength,
    downloadedSha256: sha256,
    hashMatches: sha256 === deliveryBody.audio.artifact.contentHash,
    purchaseStatus: deliveryBody.purchase?.status,
    deliveryStatus: delivery.status,
    unauthenticatedStatus: anonymous.status,
    signedUrlPublished: false,
    note: "CC0 demo audio from Freesound. Seller identities and offer terms are fixtures. This is not a licensed client track.",
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log("Audio delivery confirmed.");
  console.log(`Artifact: ${evidence.artifactId}`);
  console.log(`Bytes: ${evidence.downloadedBytes} | Hash matches: ${evidence.hashMatches}`);
  console.log(`Purchase status: ${evidence.purchaseStatus}`);
  console.log(`Unauthenticated: ${evidence.unauthenticatedStatus}`);
  console.log(`Evidence written to ${evidencePath}`);
}

main().catch(error => {
  console.error("Audio delivery proof failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

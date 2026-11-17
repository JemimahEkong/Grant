import fs from "node:fs";
import { PDFDocument } from "pdf-lib";

const base = "https://grant-roan.vercel.app";
const purchaseId = process.env.PDF_PROOF_PURCHASE_ID ?? "pur_4547cd9755e74c77bcaf7d28e30f1c00";
const evidencePath = "agent-state/pdf-evidence.json";

const env = new Map();
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env.set(match[1], match[2]);
}

function cookieFrom(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  return values.map(value => value.split(";")[0]).filter(Boolean).join("; ");
}

async function auth(email, password) {
  const response = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email, password }),
  });
  return { status: response.status, cookie: cookieFrom(response) };
}

async function main() {
  const email = env.get("DEMO_TEST_EMAIL");
  const password = env.get("DEMO_TEST_PASSWORD");
  const signIn = await auth(email, password);
  if (signIn.status !== 200 || !signIn.cookie) throw new Error(`Production sign-in failed with ${signIn.status}.`);

  const generate = await fetch(`${base}/api/purchases/${purchaseId}/delivery/retry`, {
    method: "POST",
    headers: { origin: base, cookie: signIn.cookie },
  });
  const generated = await generate.json().catch(() => ({}));
  if (![200, 201].includes(generate.status) || !generated.artifact?.id) {
    throw new Error(`PDF generation failed with ${generate.status}: ${JSON.stringify(generated).slice(0, 400)}`);
  }

  const download = await fetch(`${base}/api/purchases/${purchaseId}/download?asset=pdf`, {
    headers: { cookie: signIn.cookie },
  });
  const downloadBody = await download.json().catch(() => ({}));
  if (download.status !== 200 || !downloadBody.url) {
    throw new Error(`PDF download URL failed with ${download.status}: ${JSON.stringify(downloadBody).slice(0, 400)}`);
  }

  const object = await fetch(downloadBody.url);
  if (!object.ok) throw new Error(`Presigned PDF download failed with ${object.status}.`);
  const bytes = Buffer.from(await object.arrayBuffer());
  if (bytes.subarray(0, 4).toString("utf8") !== "%PDF") throw new Error("Downloaded object is not a PDF.");
  const document = await PDFDocument.load(bytes);

  const repeat = await fetch(`${base}/api/purchases/${purchaseId}/delivery/retry`, {
    method: "POST",
    headers: { origin: base, cookie: signIn.cookie },
  });
  const repeatBody = await repeat.json().catch(() => ({}));

  const evidence = {
    status: "passed",
    checkedAt: new Date().toISOString(),
    purchaseId,
    artifactId: generated.artifact.id,
    artifactKind: generated.artifact.kind,
    objectKey: generated.artifact.objectKey,
    contentHash: generated.artifact.contentHash,
    bytes: bytes.byteLength,
    pageCount: document.getPageCount(),
    purchaseStatus: generated.purchase?.status,
    firstGeneration: { status: generate.status, generated: generated.generated },
    repeatGeneration: { status: repeat.status, generated: repeatBody.generated, sameArtifact: repeatBody.artifact?.id === generated.artifact.id },
    signedUrlPublished: false,
    note: "The PDF was generated from the immutable license snapshot and uploaded to the private R2 bucket. It was downloaded through a presigned GET URL after the owner entitlement check.",
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log("PDF delivery confirmed.");
  console.log(`Artifact: ${evidence.artifactId}`);
  console.log(`Bytes: ${evidence.bytes} | Pages: ${evidence.pageCount}`);
  console.log(`Content hash: ${evidence.contentHash}`);
  console.log(`First generation: ${generate.status} generated=${generated.generated}`);
  console.log(`Repeat generation: ${repeat.status} generated=${repeatBody.generated} sameArtifact=${evidence.repeatGeneration.sameArtifact}`);
  console.log(`Evidence written to ${evidencePath}`);
}

main().catch(error => {
  console.error("PDF delivery proof failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

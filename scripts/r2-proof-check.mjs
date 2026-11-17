import { createHash } from "node:crypto";
import fs from "node:fs";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Pool } from "@neondatabase/serverless";

const localBase = "http://localhost:3000";
const productionBase = "https://grant-roan.vercel.app";
const evidencePath = "agent-state/r2-evidence.json";
const tempPath = ".tmp-r2-proof.json";

const fixture = JSON.parse(fs.readFileSync(tempPath, "utf8"));
const env = new Map();
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env.set(match[1], match[2]);
}

const ownerEmail = fixture.ownerEmail;
const ownerPassword = env.get("DEMO_TEST_PASSWORD");
const otherEmail = fixture.otherEmail;
const otherPassword = env.get("R2_OTHER_TEST_PASSWORD");
if (!ownerPassword || !otherPassword) throw new Error("R2 proof credentials are incomplete.");

function cookieFrom(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  return values.map(value => value.split(";")[0]).filter(Boolean).join("; ");
}

async function authRequest(base, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(body),
  });
  return { status: response.status, cookie: cookieFrom(response), body: await response.json().catch(() => ({})) };
}

async function signIn(base, email, password) {
  return authRequest(base, "/api/auth/sign-in/email", { email, password });
}

async function ensureOtherUser() {
  let result = await signIn(localBase, otherEmail, otherPassword);
  if (result.status === 200 && result.cookie) return result;
  result = await authRequest(localBase, "/api/auth/sign-up/email", {
    email: otherEmail,
    password: otherPassword,
    name: "R2 Other User",
  });
  if (result.status !== 200 || !result.cookie) {
    throw new Error(`Could not create the non-owner test session: ${result.status}`);
  }
  return result;
}

async function downloadRequest(base, cookie) {
  const response = await fetch(`${base}/api/purchases/${fixture.purchaseId}/download?asset=pdf`, {
    headers: cookie ? { cookie } : {},
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function checkObject(download) {
  if (download.status !== 200 || !download.body.url) {
    throw new Error(`Expected a presigned download, received ${download.status}.`);
  }
  const response = await fetch(download.body.url);
  if (!response.ok) throw new Error(`The presigned object request failed with ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    status: response.status,
    bytes: bytes.byteLength,
    sha256,
    matches: bytes.byteLength === fixture.expectedSize && sha256 === fixture.expectedSha256,
  };
}

function s3Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.get("R2_ACCESS_KEY_ID"),
      secretAccessKey: env.get("R2_SECRET_ACCESS_KEY"),
    },
  });
}

async function cleanup(pool) {
  try {
    await s3Client().send(
      new DeleteObjectCommand({
        Bucket: env.get("R2_BUCKET_NAME"),
        Key: fixture.objectKey,
      }),
    );
  } catch {
    console.error("R2 cleanup did not complete. The object key was withheld.");
  }

  await pool.query("delete from artifacts where id = $1", [fixture.artifactId]);
  await pool.query("delete from receipts where purchase_id = $1", [fixture.purchaseId]);
  await pool.query("delete from reservations where purchase_id = $1", [fixture.purchaseId]);
  await pool.query("delete from approvals where purchase_id = $1", [fixture.purchaseId]);
  await pool.query("delete from payment_attempts where purchase_id = $1", [fixture.purchaseId]);
  await pool.query("delete from licenses where id = $1", [fixture.licenseId]);
  await pool.query("delete from purchases where id = $1", [fixture.purchaseId]);
  await pool.query("delete from projects where id = $1", [fixture.projectId]);
  await pool.query("delete from offers where id = $1", [fixture.offerId]);

  const otherUser = await pool.query('select id from "user" where email = $1', [otherEmail]);
  if (otherUser.rowCount) {
    const id = otherUser.rows[0].id;
    await pool.query("delete from session where user_id = $1", [id]);
    await pool.query("delete from account where user_id = $1", [id]);
    await pool.query('delete from "user" where id = $1', [id]);
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  let evidence;
  try {
    const ownerLocal = await signIn(localBase, ownerEmail, ownerPassword);
    if (ownerLocal.status !== 200 || !ownerLocal.cookie) {
      throw new Error(`Local owner sign-in failed with ${ownerLocal.status}.`);
    }
    const otherLocal = await ensureOtherUser();

    const ownerDownloadLocal = await downloadRequest(localBase, ownerLocal.cookie);
    const otherDownloadLocal = await downloadRequest(localBase, otherLocal.cookie);
    const anonymousDownloadLocal = await downloadRequest(localBase, null);
    const objectLocal = await checkObject(ownerDownloadLocal);

    const ownerProduction = await signIn(productionBase, ownerEmail, ownerPassword);
    if (ownerProduction.status !== 200 || !ownerProduction.cookie) {
      throw new Error(`Production owner sign-in failed with ${ownerProduction.status}.`);
    }
    const ownerDownloadProduction = await downloadRequest(productionBase, ownerProduction.cookie);
    const anonymousDownloadProduction = await downloadRequest(productionBase, null);
    const objectProduction = await checkObject(ownerDownloadProduction);

    evidence = {
      status: "passed",
      checkedAt: new Date().toISOString(),
      bucket: env.get("R2_BUCKET_NAME"),
      objectKey: fixture.objectKey,
      objectBytes: fixture.expectedSize,
      objectSha256: fixture.expectedSha256,
      local: {
        ownerDownload: ownerDownloadLocal.status,
        ownerBytes: objectLocal.bytes,
        ownerSha256Matches: objectLocal.matches,
        unauthenticated: anonymousDownloadLocal.status,
        nonOwner: otherDownloadLocal.status,
      },
      production: {
        ownerDownload: ownerDownloadProduction.status,
        ownerBytes: objectProduction.bytes,
        ownerSha256Matches: objectProduction.matches,
        unauthenticated: anonymousDownloadProduction.status,
      },
      signedUrlPublished: false,
      note: "The settled purchase and receipt are an R2 entitlement fixture, not a real product payment.",
    };

    if (
      ownerDownloadLocal.status !== 200 ||
      !objectLocal.matches ||
      anonymousDownloadLocal.status !== 401 ||
      otherDownloadLocal.status !== 404 ||
      ownerDownloadProduction.status !== 200 ||
      !objectProduction.matches ||
      anonymousDownloadProduction.status !== 401
    ) {
      evidence.status = "failed";
      throw new Error("One or more R2 proof checks failed.");
    }

    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
    console.log("R2 proof passed.");
    console.log(`Local owner download: ${evidence.local.ownerDownload}, bytes match: ${evidence.local.ownerSha256Matches}`);
    console.log(`Local unauthenticated: ${evidence.local.unauthenticated}, non-owner: ${evidence.local.nonOwner}`);
    console.log(`Production owner download: ${evidence.production.ownerDownload}, bytes match: ${evidence.production.ownerSha256Matches}`);
    console.log(`Production unauthenticated: ${evidence.production.unauthenticated}`);
    console.log(`Evidence written to ${evidencePath}`);
  } finally {
    await cleanup(pool);
    await pool.end();
    fs.rmSync(tempPath, { force: true });
  }
}

main().catch(error => {
  console.error("R2 proof failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});

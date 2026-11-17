import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const missing = required.filter(name => !process.env[name]);

if (missing.length > 0) {
  console.error(`R2 private storage is not configured. Missing: ${missing.join(", ")}.`);
  process.exit(1);
}

const endpoint = process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME }));
  console.log("R2 private bucket connectivity verified. No public object URL was used.");
} catch {
  console.error("R2 check failed. Credentials, bucket, and endpoint details were withheld.");
  process.exit(1);
}

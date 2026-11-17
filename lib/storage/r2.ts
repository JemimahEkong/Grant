import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RepositoryError } from "../db/errors";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
};

export type SignedDownload = {
  url: string;
  expiresAt: string;
};

const allowedKeyPattern = /^(audio|artifacts|licenses)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export function assertPrivateObjectKey(key: string): void {
  if (
    key.length === 0 ||
    key.length > 512 ||
    key.includes("..") ||
    key.includes("\\") ||
    key.startsWith("/") ||
    !allowedKeyPattern.test(key)
  ) {
    throw new RepositoryError("INVALID_OBJECT_KEY", "The private object key is not valid.", 400);
  }
}

export function resolveR2Config(env: Record<string, string | undefined> = process.env): R2Config {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new RepositoryError("STORAGE_NOT_CONFIGURED", "Private object storage is not configured.", 503);
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

let cachedClient: { fingerprint: string; client: S3Client } | undefined;

export function getR2Client(config: R2Config = resolveR2Config()): S3Client {
  const fingerprint = `${config.endpoint}:${config.bucketName}:${config.accessKeyId}`;
  if (!cachedClient || cachedClient.fingerprint !== fingerprint) {
    cachedClient = { fingerprint, client: createR2Client(config) };
  }
  return cachedClient.client;
}

export async function putPrivateObject(input: {
  key: string;
  body: Uint8Array | string;
  contentType: string;
  config?: R2Config;
  client?: S3Client;
}): Promise<{ key: string; etag: string | null }> {
  assertPrivateObjectKey(input.key);
  const config = input.config ?? resolveR2Config();
  const client = input.client ?? getR2Client(config);
  const result = await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  return { key: input.key, etag: result.ETag ?? null };
}

export async function createSignedDownload(input: {
  key: string;
  expiresInSeconds?: number;
  config?: R2Config;
  client?: S3Client;
}): Promise<SignedDownload> {
  assertPrivateObjectKey(input.key);
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 30 || expiresInSeconds > 3600) {
    throw new RepositoryError("INVALID_URL_EXPIRY", "Signed download expiry must be between 30 and 3600 seconds.", 400);
  }
  const config = input.config ?? resolveR2Config();
  const client = input.client ?? getR2Client(config);
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.bucketName, Key: input.key }),
    { expiresIn: expiresInSeconds },
  );
  return {
    url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

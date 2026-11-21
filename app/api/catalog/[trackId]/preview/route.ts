import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { Readable } from "node:stream";
import { getDatabase } from "../../../../../lib/db/client";
import { RepositoryError } from "../../../../../lib/db/errors";
import { tracks } from "../../../../../lib/db/schema";
import { consumeIpRateLimit, clientIp } from "../../../../../lib/http/ip-rate-limit";
import { jsonResponse } from "../../../../../lib/http";
import { etagMatches, parseByteRange } from "../../../../../lib/catalog/preview-range";
import { assertPrivateObjectKey, getR2Client, resolveR2Config } from "../../../../../lib/storage/r2";

export const runtime = "nodejs";

const cacheControl = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function previewError(code: string, message: string, status: number, extraHeaders: Record<string, string> = {}) {
  const response = jsonResponse({ code, message }, status);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(response.body, { status, headers });
}

function notFoundOrUnavailable(error: unknown): Response {
  if (error instanceof RepositoryError) {
    if (error.status === 503) {
      return previewError("STORAGE_NOT_CONFIGURED", "Preview storage is not configured.", 503);
    }
  }
  if (error && typeof error === "object") {
    const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (candidate.name === "NoSuchKey" || candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404) {
      return previewError("PREVIEW_NOT_AVAILABLE", "This track has no preview.", 404);
    }
  }
  return previewError("PREVIEW_UNAVAILABLE", "The preview could not be loaded.", 502);
}

export async function GET(request: Request, context: { params: Promise<{ trackId: string }> }) {
  const ip = clientIp(request);
  const limit = consumeIpRateLimit(ip);
  if (!limit.allowed) {
    return previewError("RATE_LIMITED", "Too many preview requests. Retry shortly.", 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const { trackId } = await context.params;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(trackId)) {
    return previewError("TRACK_NOT_FOUND", "The track was not found.", 404);
  }

  const [track] = await getDatabase()
    .select({ id: tracks.id, previewAllowed: tracks.previewAllowed, previewKey: tracks.previewKey })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .limit(1);

  if (!track) return previewError("TRACK_NOT_FOUND", "The track was not found.", 404);
  if (!track.previewAllowed) {
    return previewError("PREVIEW_NOT_ALLOWED", "This track does not allow previews.", 403);
  }
  if (!track.previewKey) {
    return previewError("PREVIEW_NOT_AVAILABLE", "This track has no preview yet.", 404);
  }

  try {
    assertPrivateObjectKey(track.previewKey);
  } catch {
    return previewError("PREVIEW_NOT_AVAILABLE", "This track has no usable preview.", 404);
  }

  try {
    const config = resolveR2Config();
    const client = getR2Client(config);
    const head = await client.send(
      new HeadObjectCommand({ Bucket: config.bucketName, Key: track.previewKey }),
    );

    const size = head.ContentLength;
    if (!size || size <= 0) {
      return previewError("PREVIEW_NOT_AVAILABLE", "This track has no usable preview.", 404);
    }

    const etag = head.ETag ?? null;
    const contentType = head.ContentType ?? "audio/mpeg";
    const baseHeaders: Record<string, string> = {
      "Cache-Control": cacheControl,
      "Accept-Ranges": "bytes",
      "Content-Type": contentType,
      "Content-Disposition": 'inline; filename="grant-preview.mp3"',
      "X-Content-Type-Options": "nosniff",
    };
    if (etag) baseHeaders.ETag = etag;

    if (etagMatches(request.headers.get("if-none-match"), etag)) {
      return new Response(null, { status: 304, headers: baseHeaders });
    }

    const range = parseByteRange(request.headers.get("range"), size);
    if (range === "invalid") {
      const extra: Record<string, string> = {
        "Content-Range": `bytes */${size}`,
        "Accept-Ranges": "bytes",
      };
      if (etag) extra.ETag = etag;
      return previewError("RANGE_NOT_SATISFIABLE", "The requested byte range is not available.", 416, extra);
    }

    const object = await client.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: track.previewKey,
        ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
      }),
    );

    if (!object.Body) {
      return previewError("PREVIEW_UNAVAILABLE", "The preview could not be loaded.", 502);
    }

    const headers = new Headers(baseHeaders);
    if (range) {
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      headers.set("Content-Length", String(range.end - range.start + 1));
    } else {
      headers.set("Content-Length", String(size));
    }

    const body = object.Body as Readable & { transformToWebStream?: () => ReadableStream };
    const stream = (
      typeof body.transformToWebStream === "function" ? body.transformToWebStream() : Readable.toWeb(body)
    ) as unknown as ReadableStream;
    return new Response(stream, { status: range ? 206 : 200, headers });
  } catch (error) {
    return notFoundOrUnavailable(error);
  }
}

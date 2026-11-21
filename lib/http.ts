import { z } from "zod";
import { RepositoryError } from "./db/errors";

const maximumBodyBytes = 16_384;

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function publicJsonResponse(
  body: unknown,
  options: { maxAge?: number; sMaxAge?: number; staleWhileRevalidate?: number } = {},
) {
  const maxAge = options.maxAge ?? 60;
  const sMaxAge = options.sMaxAge ?? 300;
  const staleWhileRevalidate = options.staleWhileRevalidate ?? 600;
  return Response.json(body, {
    status: 200,
    headers: {
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<{ data: z.output<Schema> } | { response: Response }> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return { response: jsonResponse({ code: "JSON_REQUIRED", message: "Send an application/json request." }, 415) };
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  try {
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > maximumBodyBytes) {
          await reader.cancel();
          return { response: jsonResponse({ code: "BODY_TOO_LARGE", message: "Keep the request under 16 KiB." }, 413) };
        }
        chunks.push(chunk.value);
      }
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      return {
        response: jsonResponse({
          code: "INVALID_BRIEF",
          message: "Confirm all required project-use details.",
          issues: parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
        }, 400),
      };
    }
    return { data: parsed.data };
  } catch {
    return { response: jsonResponse({ code: "INVALID_JSON", message: "Send valid UTF-8 JSON." }, 400) };
  } finally {
    reader?.releaseLock();
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof RepositoryError) {
    return jsonResponse(
      {
        code: error.code,
        message: error.message,
        ...(error.details ?? {}),
      },
      error.status,
    );
  }
  return jsonResponse({ code: "INTERNAL_ERROR", message: "The request could not be completed." }, 500);
}

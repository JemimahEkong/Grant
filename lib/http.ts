import { z } from "zod";

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

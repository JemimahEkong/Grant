import { z } from "zod";
import { assertSameOrigin } from "../../../lib/auth/origin";
import { requireDemoSession } from "../../../lib/auth/session";
import { getDatabase } from "../../../lib/db/client";
import { createProject } from "../../../lib/db/repositories";
import { jsonSafe } from "../../../lib/db/serialize";
import { errorResponse, jsonResponse, parseJsonBody } from "../../../lib/http";
import { briefSchema } from "../../../lib/licensing/schema";

export const runtime = "nodejs";

const createProjectSchema = z.strictObject({
  clientPrivateName: z.string().min(1).max(200),
  publicDisplayLabel: z.string().min(1).max(200),
  brief: briefSchema,
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireDemoSession(request.headers);
    const parsed = await parseJsonBody(request, createProjectSchema);
    if ("response" in parsed) return parsed.response;

    const project = await createProject(getDatabase(), {
      ownerId: context.ownerId,
      clientPrivateName: parsed.data.clientPrivateName,
      publicDisplayLabel: parsed.data.publicDisplayLabel,
      brief: parsed.data.brief,
    });
    return jsonResponse({ project: jsonSafe(project) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

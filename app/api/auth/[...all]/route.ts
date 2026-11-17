import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "../../../../lib/auth/server";

export const runtime = "nodejs";

const handler = toNextJsHandler(request => getAuth().handler(request));

export const { GET, POST, PATCH, PUT, DELETE } = handler;

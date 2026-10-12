import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../src/lib/auth.js";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

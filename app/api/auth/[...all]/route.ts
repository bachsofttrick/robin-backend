import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../src/lib/auth.js";
import { withTiming } from "../../../../src/lib/timing.js";

const handler = toNextJsHandler(auth);

export const GET = withTiming(handler.GET);
export const POST = withTiming(handler.POST);
export const PATCH = withTiming(handler.PATCH);
export const PUT = withTiming(handler.PUT);
export const DELETE = withTiming(handler.DELETE);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

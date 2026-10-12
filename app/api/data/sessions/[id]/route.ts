import { sessionGet, sessionPatch } from "../../../../../src/routes/data/sessions.js";
import { withTiming } from "../../../../../src/lib/timing.js";

export const GET = withTiming(sessionGet);
export const PATCH = withTiming(sessionPatch);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

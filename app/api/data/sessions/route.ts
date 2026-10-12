import { sessionsDelete, sessionsPost } from "../../../../src/routes/data/sessions.js";
import { withTiming } from "../../../../src/lib/timing.js";

export const POST = withTiming(sessionsPost);
export const DELETE = withTiming(sessionsDelete);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

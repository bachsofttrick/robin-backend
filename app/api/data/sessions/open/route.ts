import { sessionsOpenGet } from "../../../../../src/routes/data/sessions.js";
import { withTiming } from "../../../../../src/lib/timing.js";

export const GET = withTiming(sessionsOpenGet);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

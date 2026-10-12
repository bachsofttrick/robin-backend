import { healthGet } from "../../src/routes/health.js";
import { withTiming } from "../../src/lib/timing.js";

export const GET = withTiming(healthGet);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

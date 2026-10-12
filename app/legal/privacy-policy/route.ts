import { privacyPolicyGet } from "../../../src/routes/legal/index.js";
import { withTiming } from "../../../src/lib/timing.js";

export const GET = withTiming(privacyPolicyGet);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

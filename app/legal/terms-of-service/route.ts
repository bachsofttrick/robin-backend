import { termsOfServiceGet } from "../../../src/routes/legal/index.js";
import { withTiming } from "../../../src/lib/timing.js";

export const GET = withTiming(termsOfServiceGet);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

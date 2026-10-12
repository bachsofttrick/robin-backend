import { profilesPut } from "../../../../src/routes/data/profiles.js";
import { withTiming } from "../../../../src/lib/timing.js";

export const PUT = withTiming(profilesPut);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { profileGet, profilePut } from "../../../../src/routes/data/profile.js";
import { withTiming } from "../../../../src/lib/timing.js";

export const GET = withTiming(profileGet);
export const PUT = withTiming(profilePut);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

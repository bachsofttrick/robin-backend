import { generationsPost } from "../../../../../src/routes/ai/generations.js";
import { withTiming } from "../../../../../src/lib/timing.js";

export const POST = withTiming(generationsPost);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

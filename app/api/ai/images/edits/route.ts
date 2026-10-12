import { editsPost } from "../../../../../src/routes/ai/edits.js";
import { withTiming } from "../../../../../src/lib/timing.js";

export const POST = withTiming(editsPost);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

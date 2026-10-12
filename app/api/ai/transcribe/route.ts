import { transcribePost } from "../../../../src/routes/ai/transcribe.js";
import { withTiming } from "../../../../src/lib/timing.js";

export const POST = withTiming(transcribePost);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

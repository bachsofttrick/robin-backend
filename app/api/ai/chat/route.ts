import { chatPost } from "../../../../src/routes/ai/chat.js";
import { withTiming } from "../../../../src/lib/timing.js";

export const POST = withTiming(chatPost);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

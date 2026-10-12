import { memoryDelete, memoryGet, memoryPost } from "../../../../src/routes/data/memory.js";
import { withTiming } from "../../../../src/lib/timing.js";

export const GET = withTiming(memoryGet);
export const POST = withTiming(memoryPost);
export const DELETE = withTiming(memoryDelete);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

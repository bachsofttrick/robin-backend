import { handle } from "@hono/vercel";
import { app } from "../../src/appDef.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(app);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};

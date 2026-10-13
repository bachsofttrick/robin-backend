import "hono";
import { serve } from '@hono/node-server';
import { app } from "./appDef.js";
import { port } from "./lib/env.js";

serve({
    fetch: app.fetch,
    port: port(),
    hostname: '0.0.0.0'
});

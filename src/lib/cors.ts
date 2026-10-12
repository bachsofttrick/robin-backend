import { trustedOrigins } from "./env.js";

/** Whether `origin` is one of the configured trusted origins. */
export function trustedOrigin(origin: string | null): origin is string {
  return origin !== null && trustedOrigins().includes(origin);
}

/** The credentialed CORS headers a simple request from `origin` gets, empty when untrusted. */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!trustedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

/** The CORS headers an `OPTIONS` preflight from `origin` gets, empty when untrusted. */
export function preflightHeaders(origin: string | null, requestedHeaders: string | null): Record<string, string> {
  const base = corsHeaders(origin);
  if (Object.keys(base).length === 0) return {};
  return {
    ...base,
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": requestedHeaders ?? "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

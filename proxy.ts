import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { corsHeaders, preflightHeaders } from "./src/lib/cors.js";

export function proxy(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders(origin, request.headers.get("access-control-request-headers")),
    });
  }
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = { matcher: ["/api/:path*"] };

# Backend routing (pure Next.js App Router)

The backend runs entirely on Next.js App Router route handlers. Hono and its
Vercel adapter were removed; there is no catch-all router and no standalone
server entry point.

## Layout

- `app/**/route.ts`: thin shims. Each re-exports a handler from `src/routes/**`
  as its HTTP verb(s) and sets `runtime = "nodejs"` and `dynamic = "force-dynamic"`.
- `src/routes/**`: the handler logic, written as pure
  `(request: Request) => Promise<Response>` functions so it runs under
  `bun test` without the Next.js runtime.
- `src/lib/**`: shared helpers (env, auth, session gate, CORS, AI transport).
- `proxy.ts` (project root): the request interceptor that used to be Hono's
  `cors` middleware. Next 16 renamed `middleware.ts` to `proxy.ts`; it runs on the
  Node.js runtime and is matched by `config.matcher = ["/api/:path*"]`.

## Route map

| Path | Handler (`src/`) | Shims |
|---|---|---|
| `GET /health` | `routes/health.ts` `healthGet` | `app/health/route.ts` |
| `GET /legal/privacy-policy` | `routes/legal/index.ts` `privacyPolicyGet` | `app/legal/privacy-policy/route.ts` |
| `GET /legal/terms-of-service` | `routes/legal/index.ts` `termsOfServiceGet` | `app/legal/terms-of-service/route.ts` |
| `/api/auth/*` | `toNextJsHandler(auth)` | `app/api/auth/[...all]/route.ts` |
| `GET/PUT /api/data/profile` | `routes/data/profile.ts` | `app/api/data/profile/route.ts` |
| `PUT /api/data/profiles` | `routes/data/profiles.ts` | `app/api/data/profiles/route.ts` |
| `POST/DELETE /api/data/sessions` | `routes/data/sessions.ts` | `app/api/data/sessions/route.ts` |
| `GET /api/data/sessions/open` | `routes/data/sessions.ts` `sessionsOpenGet` | `app/api/data/sessions/open/route.ts` |
| `GET /api/data/sessions/recent` | `routes/data/sessions.ts` `sessionsRecentGet` | `app/api/data/sessions/recent/route.ts` |
| `GET/PATCH /api/data/sessions/:id` | `routes/data/sessions.ts` `sessionGet`/`sessionPatch` | `app/api/data/sessions/[id]/route.ts` |
| `GET/POST/DELETE /api/data/memory` | `routes/data/memory.ts` | `app/api/data/memory/route.ts` |
| `POST /api/ai/chat` | `routes/ai/chat.ts` `chatPost` | `app/api/ai/chat/route.ts` |
| `POST /api/ai/transcribe` | `routes/ai/transcribe.ts` `transcribePost` | `app/api/ai/transcribe/route.ts` |
| `POST /api/ai/images/generations` | `routes/ai/generations.ts` `generationsPost` | `app/api/ai/images/generations/route.ts` |
| `POST /api/ai/images/edits` | `routes/ai/edits.ts` `editsPost` | `app/api/ai/images/edits/route.ts` |

Static segments `open` and `recent` take precedence over the `[id]` dynamic
segment.

## Session gate

`src/lib/session.ts` wraps `auth.api.getSession({ headers: request.headers })`:

- `getUserId(request)`: returns the user id or `null`; lookup failures propagate
  (data routes).
- `getUserIdOrNull(request)`: maps a lookup failure to `null` (AI routes, which
  treat any failure as signed out).
- `signInRequired()`: the shared `401 { error: "You need to sign in first." }`
  response every gated route uses.

## CORS

`src/lib/cors.ts` holds the pure header builders (`trustedOrigin`, `corsHeaders`,
`preflightHeaders`) driven by `trustedOrigins()` in `src/lib/env.ts`. `proxy.ts`
answers `OPTIONS` preflight with `204` plus the allowed-origin headers and
attaches the same headers to every other `/api/*` response. Untrusted origins
receive no CORS headers; better-auth separately rejects untrusted origins with
`403 INVALID_ORIGIN`.

## Tests

Handlers are imported and called directly with `Request` objects. `src/routes/router.test.ts`
keeps a small test-only dispatcher mapping method + pathname to the handler.
`src/app.test.ts` covers health, better-auth conformance, origin rejection, the
CORS proxy, the session gates, and the missing-database-config exit. The AI test
suite mocks `src/lib/auth.js`, `src/lib/ai/functions.js`, and the OpenRouter SDK
and drives `chatPost`/`transcribePost`/`generationsPost`/`editsPost`.

## Conventions

- Import specifiers use `.js` extensions (resolved to `.ts` by Next's
  `extensionAlias` and by Bun).
- Handlers return `Response.json(...)`; HTML pages return `new Response(html, ...)`.
- Dynamic-segment handlers take `(request, { params }: { params: Promise<{ id: string }> })`.
- `tsconfig.json` includes `proxy.ts` in typecheck; `src/` is pulled in through
  the routes imported by `app/**`.
- Build and run with `bun run build` / `bun start` (no custom server).

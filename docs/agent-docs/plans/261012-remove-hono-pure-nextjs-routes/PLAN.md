# Plan: Remove Hono, make all routes pure Next.js

Status: approved
Request: Consult context7. In the backend, remove hono and make all routes pure nextjs.

## Approach

Replace the single Hono catch-all (`app/[...route]/route.ts` mounting `src/appDef.ts`) with
native Next.js App Router route handlers under `app/`. Route logic stays in `src/routes/**`
as pure `(request: Request) => Promise<Response>` functions so it remains unit-testable with
`bun test`; each `app/**/route.ts` file is a thin shim that re-exports the handler as
`GET`/`POST`/`PUT`/`PATCH`/`DELETE` and sets `runtime = "nodejs"` and
`dynamic = "force-dynamic"`. The Hono `/api/*` CORS middleware becomes a Next.js `proxy.ts`
(Next 16 rename of `middleware.ts`) that keeps the same trusted-origin, credentialed
behaviour. The better-auth catch-all becomes the documented `toNextJsHandler(auth)` route.
The session gate (`c.get("userId")`) becomes a `src/lib/session.ts` helper reading
`auth.api.getSession({ headers: request.headers })`. `hono`, `@hono/vercel` and
`@hono/node-server` are removed from `package.json`.

## Affected Code

Route map (old -> new):

| Old (Hono) | New Next.js route file | Handler in `src/` |
|---|---|---|
| `GET /health` | `app/health/route.ts` | `src/routes/health.ts` `healthGet` |
| `GET /legal/privacy-policy` | `app/legal/privacy-policy/route.ts` | `src/routes/legal/index.ts` `privacyPolicyGet` |
| `GET /legal/terms-of-service` | `app/legal/terms-of-service/route.ts` | `src/routes/legal/index.ts` `termsOfServiceGet` |
| `ALL /api/auth/*` | `app/api/auth/[...all]/route.ts` | `toNextJsHandler(auth)` |
| `GET/PUT /api/data/profile` | `app/api/data/profile/route.ts` | `src/routes/data/profile.ts` `profileGet`/`profilePut` |
| `PUT /api/data/profiles` | `app/api/data/profiles/route.ts` | `src/routes/data/profiles.ts` `profilesPut` |
| `POST/DELETE /api/data/sessions` | `app/api/data/sessions/route.ts` | `src/routes/data/sessions.ts` `sessionsPost`/`sessionsDelete` |
| `GET /api/data/sessions/open` | `app/api/data/sessions/open/route.ts` | `sessionsOpenGet` |
| `GET /api/data/sessions/recent` | `app/api/data/sessions/recent/route.ts` | `sessionsRecentGet` |
| `GET/PATCH /api/data/sessions/:id` | `app/api/data/sessions/[id]/route.ts` | `sessionGet`/`sessionPatch` |
| `GET/POST/DELETE /api/data/memory` | `app/api/data/memory/route.ts` | `src/routes/data/memory.ts` `memoryGet`/`memoryPost`/`memoryDelete` |
| `POST /api/ai/chat` | `app/api/ai/chat/route.ts` | `src/routes/ai/chat.ts` `chatPost` |
| `POST /api/ai/transcribe` | `app/api/ai/transcribe/route.ts` | `src/routes/ai/transcribe.ts` `transcribePost` |
| `POST /api/ai/images/generations` | `app/api/ai/images/generations/route.ts` | `src/routes/ai/generations.ts` `generationsPost` |
| `POST /api/ai/images/edits` | `app/api/ai/images/edits/route.ts` | `src/routes/ai/edits.ts` `editsPost` |
| `use("/api/*", cors)` | `proxy.ts` | `src/lib/cors.ts` `corsHeaders`/`preflightHeaders` |

- `src/lib/session.ts` (new): `getUserId(request)` (passes errors through) and
  `getUserIdOrNull(request)` (maps a lookup failure to `null`), replacing Hono context.
- `src/lib/cors.ts` (new): trusted-origin predicate plus header builders, so CORS is testable
  without booting Next.
- `src/lib/ai/functions.ts`: `jsonBody` takes `Request` instead of Hono `Context`; drop the
  `hono` type import.
- `src/routes/**`: Hono router instances replaced by plain handler functions; `c.json(...)`
  becomes `Response.json(...)`; `c.req.json()`/`c.req.param()` become
  `request.json()`/awaited `params`.
- `src/appDef.ts`, `src/routes/ai/index.ts`, `src/routes/data/index.ts`,
  `app/[...route]/route.ts`: deleted.
- `app/**/route.ts` (new shims), `proxy.ts` (new).
- `package.json`: remove `hono`, `@hono/vercel`, `@hono/node-server`.
- `tsconfig.json`: include `proxy.ts` in typecheck. `tsconfig.backend.json`: drop the
  `hono/jsx` `jsxImportSource`.
- Tests rewritten to drive handler functions and `auth.handler` directly, plus direct
  `proxy()`/`corsHeaders` tests.

## Data Model and Contracts

No database schema changes. Contracts preserved exactly:

- Gate body: `{ "error": "You need to sign in first." }` with status `401` for `/api/data/*`
  and `/api/ai/*`.
- Handler signature: `(request: Request) => Promise<Response>`; dynamic session routes take
  `(request, { params }: { params: Promise<{ id: string }> })`.
- Untouched result shapes: `AiChatResult`, `AiTranscribeResult`, `AiImageResult`, and every
  AI sentence in `src/lib/ai/constants.ts`.
- CORS contract: only trusted origins get `Access-Control-Allow-Origin: <origin>` +
  `Access-Control-Allow-Credentials: true`; `OPTIONS` preflight answers `204`. Untrusted
  origins receive no CORS headers.

## Libraries

- next@16.4.0: App Router route handlers, `proxy.ts` request interception (Node runtime;
  `middleware.ts` is deprecated in 16), automatic tsconfig path aliases.
- better-auth@1.6.23: `toNextJsHandler` from `better-auth/next-js` for the `/api/auth/[...all]`
  route; `auth.api.getSession` unchanged.
- hono@4.13.13 / @hono/vercel@1.0.1 / @hono/node-server@2.1.4: removed.

## Risks

- The `proxy.ts` CORS path is a separate runtime from the handlers: mitigation is to keep
  header logic in `src/lib/cors.ts` and unit-test it, then test `proxy()` directly, then
  verify with `next build`.
- Next 16 renamed `middleware.ts` to `proxy.ts`: using `middleware.ts` would emit a
  deprecation warning and run on the Edge runtime; use `proxy.ts` at the project root.
- Static vs dynamic segment collisions under `sessions/`: `open` and `recent` static routes
  take precedence over `[id]`; confirm with `next build`.
- Broad test harness rewrite (all four router/app test files call the Hono `app`): mitigation
  is a small test-only dispatcher mapping method+path to handler functions, keeping the
  existing assertions.
- Removing Hono breaks every import at once: mitigation is to convert handlers first, add the
  Next shims, then delete the Hono wiring and dependencies last.
- Dropping the Hono dev CPU-time logger: accepted, dev-only noise, no functional impact.

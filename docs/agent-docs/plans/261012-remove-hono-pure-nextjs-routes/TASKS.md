# Tasks: Remove Hono, make all routes pure Next.js

Status: complete
Plan: PLAN.md

## Wave 1
- [x] T1: Request-layer helpers (session + CORS + jsonBody) (commit 6356c79)
  - Files: `src/lib/session.ts` (new), `src/lib/cors.ts` (new), `src/lib/ai/functions.ts` (edit), `src/lib/cors.test.ts` (new)
  - Do: Add `getUserId(request)` and `getUserIdOrNull(request)` in `src/lib/session.ts` reading `auth.api.getSession({ headers: request.headers })`. Add `trustedOrigin(origin)`, `corsHeaders(origin)` and `preflightHeaders(origin, requestHeaders)` in `src/lib/cors.ts` using `trustedOrigins()` from `src/lib/env.ts`; only trusted origins produce headers, preflight adds methods/headers/max-age. Change `jsonBody` in `src/lib/ai/functions.ts` to accept a `Request` and call `request.json()`, and remove the `hono` type import.
  - Tests: `src/lib/cors.test.ts` covering trusted vs untrusted origin header building and preflight header set.
  - Done when: no `hono` import remains in `src/lib`, `jsonBody` accepts a `Request`, and the new CORS tests pass.

- [x] T2: Legal and health handlers plus shims (commit b632541)
  - Files: `src/routes/health.ts` (new), `src/routes/legal/index.ts` (edit), `app/health/route.ts` (new), `app/legal/privacy-policy/route.ts` (new), `app/legal/terms-of-service/route.ts` (new), `src/routes/legal/legal.test.ts` (rewrite)
  - Do: Export `healthGet` returning `Response.json({ status: "ok" })`, and `privacyPolicyGet`/`termsOfServiceGet` returning `new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })` using the existing `PRIVACY_POLICY_HTML`/`TERMS_OF_SERVICE_HTML`. Add the three `app/**/route.ts` shims that re-export those handlers as `GET` with `runtime = "nodejs"` and `dynamic = "force-dynamic"`.
  - Tests: rewrite `src/routes/legal/legal.test.ts` to call the two legal handlers directly and assert 200, `text/html`, and page markers.
  - Done when: legal test passes against handlers and the three shims exist.

## Wave 2
- [x] T3: Convert AI handlers to pure Request/Response (commit 9eb8f9c)
  - Files: `src/routes/ai/chat.ts`, `src/routes/ai/transcribe.ts`, `src/routes/ai/generations.ts`, `src/routes/ai/edits.ts` (edit), `src/routes/ai/ai.test.ts` (rewrite)
  - Do: Replace each Hono router with exported handlers `chatPost`, `transcribePost`, `generationsPost`, `editsPost`. Each starts with the session gate (`getUserIdOrNull`, 401 `{ error: "You need to sign in first." }`), then the existing logic with `c.json(x)` -> `Response.json(x)` and `jsonBody(request)`. Keep every result shape and sentence. `imageProxy` receives `request.headers`.
  - Tests: rewrite `src/routes/ai/ai.test.ts` to import the four handlers and the existing module mocks; keep all behavioural assertions (allowlist, response_format, timeout mapping, Borel proxy, status tables).
  - Done when: AI tests pass driving handlers with `Request` objects and no Hono runtime.

- [x] T4: Convert data handlers to pure Request/Response and rewrite integration test (commit fb1d502)
  - Files: `src/routes/data/profile.ts`, `src/routes/data/profiles.ts`, `src/routes/data/sessions.ts`, `src/routes/data/memory.ts` (edit), `src/routes/router.test.ts` (rewrite)
  - Do: Export `profileGet`/`profilePut`, `profilesPut`, `sessionsPost`/`sessionsDelete`/`sessionsOpenGet`/`sessionsRecentGet`/`sessionGet`/`sessionPatch`, `memoryGet`/`memoryPost`/`memoryDelete`. Replace `c.get("userId")` with the `getUserId(request)` result (401 when null) and `c.req.param("id")` with awaited `params`. Dynamic handlers take `(request, { params }: { params: Promise<{ id: string }> })`.
  - Tests: rewrite `src/routes/router.test.ts` with a small test-only dispatcher mapping method+pathname to these handlers (and `auth.handler` for `/api/auth/*`), keeping every existing DB-backed assertion and the `test.skipIf(noDb)` guard.
  - Done when: the data integration test passes (or skips without PG env) and all data handlers are Hono-free.

## Wave 3
- [x] T5: Add Next.js API route shims: auth, data, ai, and CORS proxy (commit ee6825f)
  - Files: `app/api/auth/[...all]/route.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/transcribe/route.ts`, `app/api/ai/images/generations/route.ts`, `app/api/ai/images/edits/route.ts`, `app/api/data/profile/route.ts`, `app/api/data/profiles/route.ts`, `app/api/data/sessions/route.ts`, `app/api/data/sessions/open/route.ts`, `app/api/data/sessions/recent/route.ts`, `app/api/data/sessions/[id]/route.ts`, `app/api/data/memory/route.ts`, `proxy.ts` (all new)
  - Do: Each API shim re-exports the matching handler as its HTTP verb(s) from `@/src/routes/...`, with `runtime = "nodejs"` and `dynamic = "force-dynamic"`. The auth route uses `toNextJsHandler(auth)` from `better-auth/next-js`. `proxy.ts` exports `proxy(request: NextRequest)` at the project root: `OPTIONS` preflight returns `new NextResponse(null, { status: 204, headers: preflightHeaders(...) })`; other requests get `corsHeaders(...)` set on `NextResponse.next()`; `config.matcher = ["/api/:path*"]`.
  - Tests: none beyond T6; verified by `next build` and the T6 test pass.
  - Done when: every old Hono path has a corresponding Next route file and `proxy.ts` exists.

- [x] T6: Delete Hono wiring and rewrite the app-level test (commit d2cadb7)
  - Files: delete `src/appDef.ts`, `src/routes/ai/index.ts`, `src/routes/data/index.ts`, `app/[...route]/route.ts`; edit `src/app.test.ts` (rewrite), `tsconfig.json` (include `proxy.ts`), `tsconfig.backend.json` (drop `hono/jsx`)
  - Do: Remove the deleted files. Rewrite `src/app.test.ts` to assert: health handler 200; `corsHeaders`/`preflightHeaders` trusted vs untrusted; `proxy()` preflight 204 and header attachment; better-auth path conformance and untrusted-origin 403 via `auth.handler`; AI/data gate 401 bodies; and the missing-DB-config exit via a spawned `bun -e` probe calling `databaseUrl()` (replacing the obsolete `src/index.ts` probe). Add `proxy.ts` to the tsconfig include list and remove the Hono `jsxImportSource`.
  - Tests: `src/app.test.ts` as above.
  - Done when: `bun test` has no Hono-dependent test and the whole suite passes (DB suites may skip).

## Wave 4
- [x] T7: Remove Hono dependencies and verify the build (commit 9b5e6a4)
  - Files: `package.json`
  - Do: Remove `hono`, `@hono/vercel`, `@hono/node-server` from dependencies. Run `bun install` if needed, then `bun run typecheck`, `bun run lint`, `bun test`, and `bun run build`.
  - Tests: none (verification task).
  - Done when: `grep` finds no `hono` references outside `.git`/lockfile, and typecheck, lint, tests and `next build` all succeed.

import { afterEach, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import { proxy } from "../proxy.js";
import { auth } from "./lib/auth.js";
import { baseUrl } from "./lib/env.js";
import { chatPost } from "./routes/ai/chat.js";
import { editsPost } from "./routes/ai/edits.js";
import { generationsPost } from "./routes/ai/generations.js";
import { transcribePost } from "./routes/ai/transcribe.js";
import { profileGet } from "./routes/data/profile.js";
import { healthGet } from "./routes/health.js";

const BASE = baseUrl();
const AUTH_BASE = `${BASE}/api/auth`;
const SIGN_IN_BODY = { error: "You need to sign in first." };

const AUTH_ROUTES: Array<{ method: "POST" | "GET"; path: string }> = [
  { method: "POST", path: "/api/auth/sign-up/email" },
  { method: "POST", path: "/api/auth/sign-in/email" },
  { method: "POST", path: "/api/auth/sign-out" },
  { method: "POST", path: "/api/auth/delete-user" },
  { method: "GET", path: "/api/auth/get-session" },
  { method: "POST", path: "/api/auth/email-otp/verify-email" },
  { method: "POST", path: "/api/auth/email-otp/send-verification-otp" },
  { method: "POST", path: "/api/auth/email-otp/request-password-reset" },
  { method: "POST", path: "/api/auth/email-otp/reset-password" },
  { method: "POST", path: "/api/auth/change-password" },
];

const DATABASE_ENV_KEYS = ["PGHOST", "PGUSER", "PGPASSWORD", "PGDATABASE"];

describe("AC-1: health and auth probe", () => {
  test("GET /health returns 200 with { status: ok }", async () => {
    const response = healthGet();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("GET /api/auth/ok returns 200 with { ok: true }", async () => {
    const response = await auth.handler(new Request(`${AUTH_BASE}/ok`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe("AC-13: better-auth paths are routed", () => {
  for (const { method, path } of AUTH_ROUTES) {
    test(`${method} ${path} is routed and does not need a database`, async () => {
      const response = await auth.handler(
        new Request(`${BASE}${path}`, {
          method,
          headers: { "content-type": "application/json" },
          body: method === "POST" ? "{}" : undefined,
        }),
      );
      expect(response.status, `${method} ${path} returned 404, the path is not mounted`).not.toBe(404);
      expect(
        response.status,
        `${method} ${path} returned ${response.status}; check whether it reached the database`,
      ).toBeLessThan(500);
    });
  }
});

describe("AC-13: origin rejection", () => {
  test("POST /api/auth/sign-in/email rejects an untrusted origin when a cookie is present", async () => {
    const response = await auth.handler(
      new Request(`${AUTH_BASE}/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          cookie: "probe=1",
        },
        body: JSON.stringify({ email: "learner@example.com", password: "password-123" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    const body = (await response.json()) as { code?: string; message?: string };
    expect(body.code).toBe("INVALID_ORIGIN");
    expect(body.message?.toLowerCase()).toContain("invalid origin");
  });
});

const PREVIEW_ORIGIN = "http://localhost:8081";

let savedTrustedOrigins: string | undefined;

function withTrustedOrigin(request: () => void): void {
  savedTrustedOrigins = process.env.TRUSTED_ORIGINS;
  process.env.TRUSTED_ORIGINS = PREVIEW_ORIGIN;
  try {
    request();
  } finally {
    if (savedTrustedOrigins === undefined) delete process.env.TRUSTED_ORIGINS;
    else process.env.TRUSTED_ORIGINS = savedTrustedOrigins;
  }
}

afterEach(() => {
  if (savedTrustedOrigins === undefined) delete process.env.TRUSTED_ORIGINS;
  else process.env.TRUSTED_ORIGINS = savedTrustedOrigins;
  savedTrustedOrigins = undefined;
});

function expectPreviewCors(response: Response): void {
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(PREVIEW_ORIGIN);
  expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
}

describe("AC-26/AC-29: CORS proxy for api routes", () => {
  test("OPTIONS /api/auth/sign-in/email preflight allows the preview origin", () => {
    withTrustedOrigin(() => {
      const response = proxy(
        new NextRequest(`${BASE}/api/auth/sign-in/email`, {
          method: "OPTIONS",
          headers: { origin: PREVIEW_ORIGIN, "access-control-request-method": "POST" },
        }),
      );
      expect(response.status).toBe(204);
      expectPreviewCors(response);
    });
  });

  test("POST /api/data/profile echoes the preview origin", () => {
    withTrustedOrigin(() => {
      const response = proxy(
        new NextRequest(`${BASE}/api/data/profile`, {
          method: "POST",
          headers: { origin: PREVIEW_ORIGIN },
        }),
      );
      expectPreviewCors(response);
    });
  });

  test("an untrusted origin receives no CORS headers", () => {
    const response = proxy(
      new NextRequest(`${BASE}/api/data/profile`, {
        method: "GET",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

const AI_HANDLERS: Array<{ path: string; handler: (request: Request) => Promise<Response> }> = [
  { path: "/api/ai/chat", handler: chatPost },
  { path: "/api/ai/transcribe", handler: transcribePost },
  { path: "/api/ai/images/generations", handler: generationsPost },
  { path: "/api/ai/images/edits", handler: editsPost },
];

describe("AC-1: /api/ai handlers are gated by the session", () => {
  for (const { path, handler } of AI_HANDLERS) {
    test(`POST ${path} without a session returns the 401 sign-in body`, async () => {
      const response = await handler(
        new Request(`${BASE}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      );
      expect(response.status, `${path} -> ${response.status}`).toBe(401);
      expect(await response.json()).toEqual(SIGN_IN_BODY);
    });
  }
});

describe("AC-17: data handlers are gated by the session", () => {
  test("GET /api/data/profile without a cookie returns 401", async () => {
    const response = await profileGet(new Request(`${BASE}/api/data/profile`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(SIGN_IN_BODY);
  });
});

const ORIGIN_PROBE_SCRIPT =
  "const { auth } = await import('./lib/auth.js');" +
  "const r = await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/email'," +
  "{ method: 'POST', headers: { 'content-type': 'application/json', origin: '" +
  PREVIEW_ORIGIN +
  "', cookie: 'probe=1' }, body: '{}' }));" +
  "console.log(r.status); process.exit(0);";

function srcDir(): string {
  return new URL(".", import.meta.url).pathname;
}

function runOriginProbe(env: Record<string, string | undefined>) {
  return Bun.spawnSync({
    cmd: ["bun", "--no-env-file", "-e", ORIGIN_PROBE_SCRIPT],
    cwd: srcDir(),
    env,
    stdout: "pipe",
  });
}

describe("AC-26: trusted origin acceptance in a spawned process", () => {
  test("the preview origin is accepted when trusted and rejected when not", () => {
    const trusted = runOriginProbe({
      ...process.env,
      NODE_ENV: "test",
      TRUSTED_ORIGINS: PREVIEW_ORIGIN,
    });
    expect(new TextDecoder().decode(trusted.stdout).trim()).not.toBe("403");

    const untrustedEnv: Record<string, string | undefined> = { ...process.env, NODE_ENV: "test" };
    delete untrustedEnv.TRUSTED_ORIGINS;
    const untrusted = runOriginProbe(untrustedEnv);
    expect(new TextDecoder().decode(untrusted.stdout).trim()).toBe("403");
  });
});

describe("AC-4: missing database configuration", () => {
  test("composing a database URL without configuration exits non-zero naming the variables", () => {
    const env: Record<string, string | undefined> = {
      ...process.env,
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "test-secret",
    };
    for (const key of DATABASE_ENV_KEYS) delete env[key];

    const script = "const { databaseUrl } = await import('./lib/env.js'); databaseUrl();";
    const result = Bun.spawnSync({
      cmd: ["bun", "--no-env-file", "-e", script],
      cwd: srcDir(),
      env,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    const stderr = new TextDecoder().decode(result.stderr);
    expect(stderr).toContain("PGHOST");
  });
});

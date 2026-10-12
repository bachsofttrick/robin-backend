import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { corsHeaders, preflightHeaders, trustedOrigin } from "./cors.js";

const ENV_KEYS = ["BETTER_AUTH_URL", "TRUSTED_ORIGINS"] as const;

const TRUSTED = "http://localhost:3000";
const PREVIEW = "http://localhost:8081";

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("trustedOrigin", () => {
  test("accepts the base URL and rejects others by default", () => {
    expect(trustedOrigin(TRUSTED)).toBe(true);
    expect(trustedOrigin("https://evil.example")).toBe(false);
    expect(trustedOrigin(null)).toBe(false);
  });

  test("honours TRUSTED_ORIGINS when set", () => {
    process.env.TRUSTED_ORIGINS = PREVIEW;
    expect(trustedOrigin(PREVIEW)).toBe(true);
    expect(trustedOrigin(TRUSTED)).toBe(false);
  });
});

describe("corsHeaders", () => {
  test("echoes a trusted origin with credentials", () => {
    expect(corsHeaders(TRUSTED)).toEqual({
      "Access-Control-Allow-Origin": TRUSTED,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    });
  });

  test("adds nothing for an untrusted origin", () => {
    expect(corsHeaders("https://evil.example")).toEqual({});
  });
});

describe("preflightHeaders", () => {
  test("adds methods, requested headers, and max-age for a trusted origin", () => {
    const headers = preflightHeaders(TRUSTED, "content-type, authorization");
    expect(headers).toMatchObject({
      "Access-Control-Allow-Origin": TRUSTED,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "Access-Control-Max-Age": "86400",
    });
  });

  test("falls back to a default allow-headers list", () => {
    expect(preflightHeaders(TRUSTED, null)["Access-Control-Allow-Headers"]).toBe(
      "Content-Type, Authorization",
    );
  });

  test("adds nothing for an untrusted origin", () => {
    expect(preflightHeaders("https://evil.example", "content-type")).toEqual({});
  });
});

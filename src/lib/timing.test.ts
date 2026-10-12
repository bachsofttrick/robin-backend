import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { withTiming } from "./timing.js";

let logSpy: ReturnType<typeof spyOn> | undefined;

function captureLogs(): string[] {
  const lines: string[] = [];
  logSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.join(" "));
  });
  return lines;
}

afterEach(() => {
  logSpy?.mockRestore();
  logSpy = undefined;
});

describe("withTiming", () => {
  test("logs the method, path, and CPU time for a handled request", async () => {
    const lines = captureLogs();
    const handler = withTiming(async (request: Request) => Response.json({ ok: true }));

    const response = await handler(new Request("http://localhost/api/data/profile", { method: "GET" }));

    expect(response.status).toBe(200);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^GET \/api\/data\/profile - CPU time: \d+\.\d{4}ms$/);
  });

  test("passes through a dynamic-segment context", async () => {
    captureLogs();
    const handler = withTiming(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params;
      return Response.json({ id });
    });

    const response = await handler(new Request("http://localhost/x", { method: "GET" }), {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(await response.json()).toEqual({ id: "abc" });
  });

  test("still logs and rethrows when the handler throws", async () => {
    const lines = captureLogs();
    const handler = withTiming(async () => {
      throw new Error("boom");
    });

    await expect(handler(new Request("http://localhost/x", { method: "POST" }))).rejects.toThrow("boom");
    expect(lines).toHaveLength(1);
  });

  test("skips logging in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const lines = captureLogs();
      const handler = withTiming(async () => Response.json({ ok: true }));

      await handler(new Request("http://localhost/x", { method: "GET" }));

      expect(lines).toHaveLength(0);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});

type TimedHandler<Args extends unknown[]> = (
  request: Request,
  ...args: Args
) => Response | Promise<Response>;

/**
 * Wraps a route handler so every handled request logs its CPU time outside
 * production. The argument tuple is preserved so dynamic-segment handlers keep
 * their `{ params }` context type.
 */
export function withTiming<Args extends unknown[]>(
  handler: TimedHandler<Args>,
): TimedHandler<Args> {
  return async (request, ...args) => {
    if (process.env.NODE_ENV === "production") return await handler(request, ...args);
    const start = performance.now();
    try {
      return await handler(request, ...args);
    } finally {
      const cpuTime = performance.now() - start;
      console.log(`${request.method} ${new URL(request.url).pathname} - CPU time: ${cpuTime.toFixed(4)}ms`);
    }
  };
}

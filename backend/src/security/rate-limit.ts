import type { RequestHandler } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Minimal in-memory rate limiter (dev-friendly).
 * If you deploy multiple instances, replace with a Redis-backed limiter.
 */
export function basicRateLimit(opts: { windowMs: number; max: number }): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const b = buckets.get(key);

    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    b.count += 1;
    if (b.count > opts.max) {
      res.status(429).json({
        error: { code: "INTERNAL_ERROR", message: "Rate limited" }
      });
      return;
    }

    next();
  };
}


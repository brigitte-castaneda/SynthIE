/**
 * In-memory fixed-window limiter for model-backed endpoints. A stopgap that
 * bounds spend on the server-held key until authentication and per-user
 * quotas exist (Phase 8). Single-process only.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns seconds until retry when the caller is over the limit, otherwise null. */
  check(key: string, now = Date.now()): number | null {
    if (this.max === 0) return null; // disabled
    if (this.hits.size > 10_000) this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return null;
    }
    if (entry.count >= this.max) return Math.ceil((entry.resetAt - now) / 1000);
    entry.count++;
    return null;
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

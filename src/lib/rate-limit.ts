/**
 * Rate limiting.
 *
 * In-memory, per process, with a sliding window.
 *
 * That is a real limitation and it is stated rather than hidden: if Passenger runs more
 * than one worker, each keeps its own counter, so the effective limit is the configured one
 * multiplied by the worker count. Whether this host runs one worker or several is one of
 * the two open questions in docs/QUESTIONS.md, and the answer changes what this should be.
 *
 * It is still worth having. The attack it stops is a script hammering the enquiry endpoint,
 * and a limit that is three times looser than intended still stops that. The alternative,
 * a shared store, means another service on a shared host for a problem this size.
 *
 * When the platform moves to Postgres, this moves with it: a small table, one upsert per
 * request, and the limit becomes exact across workers.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

/**
 * Sweeps expired entries so the map cannot grow without bound.
 *
 * Called on write rather than on a timer: a timer would keep the process awake and hold a
 * reference for the lifetime of the app, which on a shared host is exactly the kind of
 * thing that shows up as unexplained memory later.
 */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Requests left in the window. */
  remaining: number;
  /** When the window resets, as a timestamp. */
  resetAt: number;
  /** Seconds until reset, for a Retry-After header or a human message. */
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Clears everything. Tests only. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * A stable key for a visitor, hashed.
 *
 * The raw address is never stored or logged. POPIA treats an IP as personal information,
 * and a rate limiter does not need to know who someone is, only that two requests came from
 * the same somewhere.
 *
 * Cloudflare's header is trusted first because the site sits behind it. On a host where
 * anything can set `x-forwarded-for`, trusting that alone would let an attacker rotate the
 * header and defeat the limit entirely.
 */
export async function visitorKey(headers: Headers, salt: string): Promise<string> {
  const ip =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

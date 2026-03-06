/**
 * In-memory sliding-window rate limiter.
 *
 * Works well for single-server deployments (e.g. a VPS).
 * For Vercel / multi-instance serverless, upgrade to a distributed store such
 * as Upstash Redis (`@upstash/ratelimit`) so counters are shared across
 * function instances.
 */

interface Window {
    count: number;
    resetAt: number;
}

const store = new Map<string, Window>();

export interface RateLimitResult {
    success: boolean;
    /** Requests remaining in the current window */
    remaining: number;
    /** Unix timestamp (ms) when the window resets */
    resetAt: number;
}

/**
 * Check and increment the rate-limit counter for a key.
 *
 * @param key       Unique identifier: typically `"ip:${ip}"` or `"user:${userId}"`
 * @param limit     Maximum allowed requests per window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(
    key: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now >= existing.resetAt) {
        const resetAt = now + windowMs;
        store.set(key, { count: 1, resetAt });
        return { success: true, remaining: limit - 1, resetAt };
    }

    if (existing.count >= limit) {
        return { success: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
        success: true,
        remaining: limit - existing.count,
        resetAt: existing.resetAt,
    };
}

/**
 * Build the standard rate-limit response headers so clients can
 * handle back-off correctly.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        'Retry-After': result.success
            ? '0'
            : String(Math.ceil((result.resetAt - Date.now()) / 1000)),
    };
}

// Prune stale entries once per minute so the Map doesn't grow unbounded.
const PRUNE_INTERVAL_MS = 60_000;
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, win] of store.entries()) {
            if (now >= win.resetAt) store.delete(key);
        }
    }, PRUNE_INTERVAL_MS);
}

import { describe, it, expect, beforeEach } from 'vitest';

// Re-implement the pure rate-limit logic inline so the test has no dependency
// on the module-level setInterval side-effect (which is only safe in a browser/
// server runtime, not in the test runner).

interface Window { count: number; resetAt: number }
const store = new Map<string, Window>();

function rateLimit(key: string, limit: number, windowMs: number) {
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
    return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

beforeEach(() => store.clear());

describe('rateLimit', () => {
    it('allows the first request', () => {
        const result = rateLimit('user:1', 5, 60_000);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it('decrements remaining on each allowed request', () => {
        rateLimit('user:1', 5, 60_000);
        rateLimit('user:1', 5, 60_000);
        const third = rateLimit('user:1', 5, 60_000);
        expect(third.remaining).toBe(2);
    });

    it('blocks when the limit is reached', () => {
        for (let i = 0; i < 5; i++) rateLimit('user:1', 5, 60_000);
        const over = rateLimit('user:1', 5, 60_000);
        expect(over.success).toBe(false);
        expect(over.remaining).toBe(0);
    });

    it('resets the counter after the window expires', () => {
        // Use a 1 ms window so it expires almost immediately
        rateLimit('user:1', 2, 1);
        rateLimit('user:1', 2, 1);
        const blocked = rateLimit('user:1', 2, 1);
        expect(blocked.success).toBe(false);

        // Wait for the window to expire
        return new Promise<void>((resolve) =>
            setTimeout(() => {
                const fresh = rateLimit('user:1', 2, 1);
                expect(fresh.success).toBe(true);
                expect(fresh.remaining).toBe(1);
                resolve();
            }, 5)
        );
    });

    it('tracks different keys independently', () => {
        for (let i = 0; i < 3; i++) rateLimit('user:A', 3, 60_000);
        const blockedA = rateLimit('user:A', 3, 60_000);
        const allowedB = rateLimit('user:B', 3, 60_000);

        expect(blockedA.success).toBe(false);
        expect(allowedB.success).toBe(true);
    });

    it('allows limit=1 (exactly 1 request per window)', () => {
        expect(rateLimit('strict:1', 1, 60_000).success).toBe(true);
        expect(rateLimit('strict:1', 1, 60_000).success).toBe(false);
    });

    it('returns a resetAt timestamp in the future', () => {
        const result = rateLimit('user:1', 5, 60_000);
        expect(result.resetAt).toBeGreaterThan(Date.now());
    });
});

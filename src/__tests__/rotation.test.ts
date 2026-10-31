/**
 * Listing-order rotation helper: default views rotate on every open while
 * explicit sort choices are preserved by the callers. Fixtures only.
 */
import { describe, it, expect, vi } from 'vitest';
import { shuffled } from '@/lib/rotation';

describe('shuffled', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];

    it('returns a new array with the same members, input untouched', () => {
        const copy = [...input];
        const out = shuffled(input);
        expect(out).not.toBe(input);
        expect([...out].sort((a, b) => a - b)).toEqual(copy);
        expect(input).toEqual(copy);
    });

    it('order varies across opens (seeded runs differ)', () => {
        const run = (seq: number[]) => {
            let i = 0;
            const rand = vi.fn(() => seq[i++ % seq.length]);
            return shuffled(input, rand).join(',');
        };
        const a = run([0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8]);
        const b = run([0.8, 0.2, 0.5, 0.7, 0.3, 0.9, 0.1]);
        expect(a).not.toEqual(b);
    });

    it('handles empty and single-item lists', () => {
        expect(shuffled([])).toEqual([]);
        expect(shuffled(['only'])).toEqual(['only']);
    });
});

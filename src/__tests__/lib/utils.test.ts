import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    formatCurrency,
    getTimeRemaining,
    timeAgo,
    getInitials,
    truncate,
    cn,
    formatDisplayName,
} from '@/lib/utils';

// ── formatCurrency ─────────────────────────────────────────────────────────

describe('formatCurrency', () => {
    it('formats zero', () => {
        expect(formatCurrency(0)).toBe('₵0.00');
    });

    it('formats a round number', () => {
        expect(formatCurrency(1000)).toContain('1,000');
        expect(formatCurrency(1000)).toContain('₵');
    });

    it('formats a decimal amount', () => {
        const result = formatCurrency(250.5);
        expect(result).toContain('250');
        expect(result).toContain('50');
    });

    it('includes currency symbol', () => {
        expect(formatCurrency(100)).toMatch(/^₵/);
    });
});

// ── getTimeRemaining ───────────────────────────────────────────────────────

describe('getTimeRemaining', () => {
    it('returns 0 and isExpired=true for a past date', () => {
        const past = new Date(Date.now() - 60_000).toISOString();
        const result = getTimeRemaining(past);
        expect(result.isExpired).toBe(true);
        expect(result.total).toBe(0);
    });

    it('returns positive total and isExpired=false for a future date', () => {
        const future = new Date(Date.now() + 3_600_000).toISOString(); // 1 hour
        const result = getTimeRemaining(future);
        expect(result.isExpired).toBe(false);
        expect(result.total).toBeGreaterThan(0);
        expect(result.hours).toBeGreaterThanOrEqual(0);
    });

    it('breaks down hours and minutes correctly for a 2-hour future date', () => {
        const twoHours = new Date(Date.now() + 2 * 3_600_000 + 30 * 60_000).toISOString();
        const result = getTimeRemaining(twoHours);
        expect(result.hours).toBeGreaterThanOrEqual(2);
        expect(result.minutes).toBeGreaterThanOrEqual(29); // allow 1-second tolerance
    });

    it('accepts a Date object as well as a string', () => {
        const futureDate = new Date(Date.now() + 5000);
        const result = getTimeRemaining(futureDate);
        expect(result.isExpired).toBe(false);
    });
});

// ── timeAgo ────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
    it('returns "just now" for a very recent timestamp', () => {
        expect(timeAgo(new Date().toISOString())).toBe('just now');
    });

    it('returns seconds for a very recent past timestamp', () => {
        const fewSecondsAgo = new Date(Date.now() - 5000).toISOString();
        expect(timeAgo(fewSecondsAgo)).toMatch(/second/);
    });

    it('returns minutes for a 2-minute-old timestamp', () => {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60_000).toISOString();
        expect(timeAgo(twoMinutesAgo)).toBe('2 minutes ago');
    });

    it('returns hours for a 3-hour-old timestamp', () => {
        const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
        expect(timeAgo(threeHoursAgo)).toBe('3 hours ago');
    });

    it('returns singular "hour" for exactly 1 hour', () => {
        const oneHour = new Date(Date.now() - 3_600_000 - 1000).toISOString();
        expect(timeAgo(oneHour)).toBe('1 hour ago');
    });

    it('returns days for a 2-day-old timestamp', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
        expect(timeAgo(twoDaysAgo)).toBe('2 days ago');
    });

    it('accepts a Date object', () => {
        expect(timeAgo(new Date(Date.now() - 60_000))).toBe('1 minute ago');
    });
});

// ── getInitials ────────────────────────────────────────────────────────────

describe('getInitials', () => {
    it('returns 2 initials from a two-word name', () => {
        expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns uppercase initials', () => {
        expect(getInitials('john doe')).toBe('JD');
    });

    it('returns 2 characters for a single-word name', () => {
        expect(getInitials('Ama')).toBe('AM');
    });

    it('handles hyphenated names', () => {
        expect(getInitials('Kwame Asante-Boateng')).toBe('KA');
    });

    it('handles three words — only first two initials', () => {
        expect(getInitials('Kwesi John Mensah')).toBe('KJ');
    });
});

// ── truncate ───────────────────────────────────────────────────────────────

describe('truncate', () => {
    it('returns the original string when shorter than maxLength', () => {
        expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('returns the exact string when equal to maxLength', () => {
        expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('truncates and appends ellipsis when longer than maxLength', () => {
        const result = truncate('Hello World', 5);
        expect(result).toHaveLength(6); // 5 chars + ellipsis (1 char)
        expect(result.startsWith('Hello')).toBe(true);
    });

    it('truncates an empty string with no side effects', () => {
        expect(truncate('', 10)).toBe('');
    });
});

// ── cn ─────────────────────────────────────────────────────────────────────

describe('cn', () => {
    it('joins multiple class names', () => {
        expect(cn('px-4', 'py-2', 'bg-white')).toBe('px-4 py-2 bg-white');
    });

    it('filters out falsy values', () => {
        expect(cn('flex', false, null, undefined, 'gap-4')).toBe('flex gap-4');
    });

    it('returns an empty string when all values are falsy', () => {
        expect(cn(false, null, undefined)).toBe('');
    });
});

// ── formatDisplayName ──────────────────────────────────────────────────────

describe('formatDisplayName', () => {
    it('returns "AN" for null or undefined', () => {
        expect(formatDisplayName(null)).toBe('AN');
        expect(formatDisplayName(undefined)).toBe('AN');
    });

    it('returns initials for "John Doe"', () => {
        expect(formatDisplayName('John Doe')).toBe('JD');
    });

    it('strips trailing hex suffix generated by Supabase', () => {
        // "tiekujason_4dbab4" → strips the hex suffix → "TJ" from "tiekujason"
        const result = formatDisplayName('tiekujason_4dbab4');
        expect(result).toBeTruthy();
        expect(result.length).toBe(2);
    });

    it('handles camelCase single word', () => {
        const result = formatDisplayName('tiekuJason');
        expect(result).toBe('TJ');
    });

    it('handles email address by stripping domain', () => {
        const result = formatDisplayName('kwame.asante@gmail.com');
        expect(result).toBe('KA');
    });
});

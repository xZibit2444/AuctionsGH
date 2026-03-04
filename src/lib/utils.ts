import { CURRENCY_SYMBOL } from './constants';

/**
 * Format a number as Ghana Cedi currency.
 */
export function formatCurrency(amount: number): string {
    return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Compute time remaining from now until a future date.
 */
export function getTimeRemaining(endTime: string | Date): {
    total: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
} {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const total = Math.max(0, end - now);

    return {
        total,
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        hours: Math.floor((total / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((total / (1000 * 60)) % 60),
        seconds: Math.floor((total / 1000) % 60),
        isExpired: total <= 0,
    };
}

/**
 * Human-readable relative time (e.g., "2 hours ago").
 */
export function timeAgo(date: string | Date): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    const intervals: [number, string][] = [
        [31536000, 'year'],
        [2592000, 'month'],
        [86400, 'day'],
        [3600, 'hour'],
        [60, 'minute'],
        [1, 'second'],
    ];

    for (const [secondsInUnit, unit] of intervals) {
        const count = Math.floor(seconds / secondsInUnit);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
}

/**
 * Generate initials from a name (for avatar fallback).
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
}

/**
 * Generate a Supabase Storage public URL for an image path.
 */
export function getStorageUrl(bucket: string, path: string): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Merge Tailwind class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

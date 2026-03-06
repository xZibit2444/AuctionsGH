import { describe, it, expect } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────
// These tests replicate the exact validation rules used in POST /api/bids.
// They run without any network or database connection.
// ──────────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BID_AMOUNT = 999_999;

function validateBidInput(auction_id: unknown, amount: unknown): string | null {
    if (!auction_id || typeof auction_id !== 'string' || !UUID_REGEX.test(auction_id)) {
        return 'A valid auction_id (UUID) is required';
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return 'amount must be a positive number';
    }
    if (amount > MAX_BID_AMOUNT) {
        return `amount cannot exceed ${MAX_BID_AMOUNT}`;
    }
    return null;
}

describe('Bid API — input validation', () => {
    const validId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    // ── auction_id ─────────────────────────────────────────────────────────

    it('passes with a valid UUID and positive amount', () => {
        expect(validateBidInput(validId, 500)).toBeNull();
    });

    it('rejects a missing auction_id', () => {
        expect(validateBidInput(undefined, 500)).toBeTruthy();
    });

    it('rejects an empty string auction_id', () => {
        expect(validateBidInput('', 500)).toBeTruthy();
    });

    it('rejects a non-UUID string as auction_id', () => {
        expect(validateBidInput('not-a-uuid', 500)).toBeTruthy();
    });

    it('rejects a numeric auction_id', () => {
        expect(validateBidInput(12345, 500)).toBeTruthy();
    });

    it('accepts uppercase UUID characters', () => {
        const upper = validId.toUpperCase();
        expect(validateBidInput(upper, 500)).toBeNull();
    });

    // ── amount ─────────────────────────────────────────────────────────────

    it('rejects amount of zero', () => {
        expect(validateBidInput(validId, 0)).toBeTruthy();
    });

    it('rejects a negative amount', () => {
        expect(validateBidInput(validId, -1)).toBeTruthy();
    });

    it('rejects a missing amount', () => {
        expect(validateBidInput(validId, undefined)).toBeTruthy();
    });

    it('rejects a string amount (no coercion in the API route)', () => {
        expect(validateBidInput(validId, '500')).toBeTruthy();
    });

    it('accepts amount of 1 (minimum positive integer)', () => {
        expect(validateBidInput(validId, 1)).toBeNull();
    });

    it('accepts amount at the maximum limit (999 999)', () => {
        expect(validateBidInput(validId, 999_999)).toBeNull();
    });

    it('rejects an amount just above the maximum (1 000 000)', () => {
        expect(validateBidInput(validId, 1_000_000)).toBeTruthy();
    });

    it('accepts a fractional amount (e.g. 100.50)', () => {
        expect(validateBidInput(validId, 100.5)).toBeNull();
    });
});

// ──────────────────────────────────────────────────────────────────────────
// Order creation — business rule guards
// (pure logic, no DB calls)
// ──────────────────────────────────────────────────────────────────────────

function canCreateOrder(auction: {
    status: string;
    winner_id: string | null;
}, requestingBuyerId: string): string | null {
    if (auction.status !== 'sold') return 'Auction is not sold';
    if (auction.winner_id !== requestingBuyerId) return 'Invalid auction state or unauthorized';
    return null;
}

describe('Order creation — business rules', () => {
    const buyerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    it('allows order creation when auction is sold and buyer is the winner', () => {
        expect(canCreateOrder({ status: 'sold', winner_id: buyerId }, buyerId)).toBeNull();
    });

    it('blocks if auction is still active', () => {
        expect(canCreateOrder({ status: 'active', winner_id: buyerId }, buyerId)).toBeTruthy();
    });

    it('blocks if auction is pending', () => {
        expect(canCreateOrder({ status: 'pending', winner_id: null }, buyerId)).toBeTruthy();
    });

    it('blocks if buyer is not the winner', () => {
        const otherBuyer = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
        expect(canCreateOrder({ status: 'sold', winner_id: otherBuyer }, buyerId)).toBeTruthy();
    });

    it('blocks if winner_id is null (no winner yet)', () => {
        expect(canCreateOrder({ status: 'sold', winner_id: null }, buyerId)).toBeTruthy();
    });
});

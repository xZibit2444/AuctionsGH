import { describe, it, expect } from 'vitest';
import {
    loginSchema,
    signupSchema,
    placeBidSchema,
    createAuctionSchema,
    updateProfileSchema,
    validateImageFile,
} from '@/lib/validators';

// ── loginSchema ────────────────────────────────────────────────────────────

describe('loginSchema', () => {
    it('accepts valid credentials', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Password1' });
        expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: 'Password1' });
        expect(result.success).toBe(false);
    });

    it('rejects a password shorter than 8 characters', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'abc' });
        expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
        expect(loginSchema.safeParse({}).success).toBe(false);
    });
});

// ── signupSchema ───────────────────────────────────────────────────────────

describe('signupSchema', () => {
    const validSignup = {
        email: 'buyer@example.com',
        password: 'Secure123',
        username: 'john_doe',
        full_name: 'John Doe',
        phone_number: '+233201234567',
        location: 'Accra',
    };

    it('accepts valid signup data', () => {
        expect(signupSchema.safeParse(validSignup).success).toBe(true);
    });

    it('rejects a username shorter than 3 characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'jd' });
        expect(result.success).toBe(false);
    });

    it('rejects a username longer than 20 characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'a'.repeat(21) });
        expect(result.success).toBe(false);
    });

    it('rejects usernames with special characters (not _ )', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'john-doe!' });
        expect(result.success).toBe(false);
    });

    it('accepts underscores in usernames', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'john_doe_42' });
        expect(result.success).toBe(true);
    });

    it('rejects an invalid Ghana phone number', () => {
        const result = signupSchema.safeParse({ ...validSignup, phone_number: '0201234567' });
        expect(result.success).toBe(false);
    });

    it('rejects a non-Ghana country code', () => {
        const result = signupSchema.safeParse({ ...validSignup, phone_number: '+447911123456' });
        expect(result.success).toBe(false);
    });

    it('rejects passwords without uppercase', () => {
        const result = signupSchema.safeParse({ ...validSignup, password: 'secure123' });
        expect(result.success).toBe(false);
    });

    it('rejects passwords without a digit', () => {
        const result = signupSchema.safeParse({ ...validSignup, password: 'SecurePass' });
        expect(result.success).toBe(false);
    });

    it('rejects a full_name shorter than 2 characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, full_name: 'X' });
        expect(result.success).toBe(false);
    });
});

// ── placeBidSchema ─────────────────────────────────────────────────────────

describe('placeBidSchema', () => {
    const validUUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    it('accepts a valid bid', () => {
        const result = placeBidSchema.safeParse({ auction_id: validUUID, amount: 500 });
        expect(result.success).toBe(true);
    });

    it('rejects a non-UUID auction_id', () => {
        const result = placeBidSchema.safeParse({ auction_id: 'not-a-uuid', amount: 500 });
        expect(result.success).toBe(false);
    });

    it('rejects a negative amount', () => {
        const result = placeBidSchema.safeParse({ auction_id: validUUID, amount: -10 });
        expect(result.success).toBe(false);
    });

    it('rejects an amount of zero', () => {
        const result = placeBidSchema.safeParse({ auction_id: validUUID, amount: 0 });
        expect(result.success).toBe(false);
    });

    it('rejects an amount exceeding 999 999', () => {
        const result = placeBidSchema.safeParse({ auction_id: validUUID, amount: 1_000_000 });
        expect(result.success).toBe(false);
    });

    it('accepts the maximum allowed amount (999 999)', () => {
        const result = placeBidSchema.safeParse({ auction_id: validUUID, amount: 999_999 });
        expect(result.success).toBe(true);
    });

    it('coerces a string amount to a number', () => {
        const result = placeBidSchema.safeParse({ auction_id: validUUID, amount: '250' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.amount).toBe(250);
    });
});

// ── createAuctionSchema ────────────────────────────────────────────────────

describe('createAuctionSchema', () => {
    const baseAuction = {
        title: 'iPhone 15 Pro Max 256GB',
        brand: 'Apple',
        model: '15 Pro Max',
        condition: 'like_new',
        starting_price: 5000,
        min_increment: 50,
        duration_hours: 24,
        listing_city: 'Accra',
        meetup_area: 'East Legon',
        delivery_available: true,
        inspection_available: true,
    };

    it('accepts a valid auction', () => {
        const result = createAuctionSchema.safeParse(baseAuction);
        expect(result.success).toBe(true);
    });

    it('rejects a title shorter than 5 characters', () => {
        const result = createAuctionSchema.safeParse({ ...baseAuction, title: 'Hi' });
        expect(result.success).toBe(false);
    });

    it('rejects a title longer than 100 characters', () => {
        const result = createAuctionSchema.safeParse({ ...baseAuction, title: 'A'.repeat(101) });
        expect(result.success).toBe(false);
    });

    it('rejects a starting_price of zero', () => {
        const result = createAuctionSchema.safeParse({ ...baseAuction, starting_price: 0 });
        expect(result.success).toBe(false);
    });

    it('rejects an invalid brand', () => {
        const result = createAuctionSchema.safeParse({ ...baseAuction, brand: 'FakeBrand' });
        expect(result.success).toBe(false);
    });

    it('rejects an invalid condition', () => {
        const result = createAuctionSchema.safeParse({ ...baseAuction, condition: 'mint' });
        expect(result.success).toBe(false);
    });

    it('rejects a description over 2000 characters', () => {
        const result = createAuctionSchema.safeParse({
            ...baseAuction,
            description: 'X'.repeat(2001),
        });
        expect(result.success).toBe(false);
    });
});

// ── updateProfileSchema ────────────────────────────────────────────────────

describe('updateProfileSchema', () => {
    it('accepts an empty update (all optional)', () => {
        expect(updateProfileSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a valid partial update', () => {
        const result = updateProfileSchema.safeParse({ username: 'new_name', location: 'Kumasi' });
        expect(result.success).toBe(true);
    });

    it('rejects an invalid phone in an update', () => {
        const result = updateProfileSchema.safeParse({ phone_number: '0541234567' });
        expect(result.success).toBe(false);
    });

    it('accepts an empty string for phone_number (to clear it)', () => {
        const result = updateProfileSchema.safeParse({ phone_number: '' });
        expect(result.success).toBe(true);
    });
});

// ── validateImageFile ──────────────────────────────────────────────────────

describe('validateImageFile', () => {
    function makeFile(type: string, sizeBytes: number): File {
        return { type, size: sizeBytes, name: 'test' } as unknown as File;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    it('accepts a valid JPEG under 5 MB', () => {
        expect(validateImageFile(makeFile('image/jpeg', MAX_SIZE - 1))).toBeNull();
    });

    it('accepts PNG and WebP', () => {
        expect(validateImageFile(makeFile('image/png', 1000))).toBeNull();
        expect(validateImageFile(makeFile('image/webp', 1000))).toBeNull();
    });

    it('rejects a disallowed MIME type', () => {
        expect(validateImageFile(makeFile('image/gif', 1000))).toBeTruthy();
        expect(validateImageFile(makeFile('application/pdf', 1000))).toBeTruthy();
    });

    it('rejects a file exactly at the 5 MB limit', () => {
        expect(validateImageFile(makeFile('image/jpeg', MAX_SIZE + 1))).toBeTruthy();
    });
});

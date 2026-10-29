import { describe, it, expect } from 'vitest';
import { updateListingSchema } from '@/lib/listingEdit';
import { getLocationsForRegion } from '@/lib/constants';

const base = {
    title: 'Samsung Galaxy A16 128GB',
    description: 'Battery health 100%',
    brand: 'Phones & Tablets',
    model: 'Samsung A16',
    storage_gb: 128,
    condition: 'good' as const,
    price: 4700,
    listing_city: 'Greater Accra',
    meetup_area: 'Circle',
    delivery_available: true,
    inspection_available: true,
};

describe('updateListingSchema', () => {
    it('accepts a valid edit', () => {
        expect(updateListingSchema.safeParse(base).success).toBe(true);
    });
    it('accepts a typed pickup area outside the list', () => {
        expect(updateListingSchema.safeParse({ ...base, meetup_area: 'Tesano Roundabout' }).success).toBe(true);
    });
    it('rejects a short title and zero price', () => {
        expect(updateListingSchema.safeParse({ ...base, title: 'abc' }).success).toBe(false);
        expect(updateListingSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
    });
    it('allows omitting price (locked after bids)', () => {
        const { price: _price, ...rest } = base;
        void _price;
        expect(updateListingSchema.safeParse(rest).success).toBe(true);
    });
});

describe('locations', () => {
    it('includes Circle for Accra regions', () => {
        expect(getLocationsForRegion('Greater Accra')).toContain('Circle');
        expect(getLocationsForRegion('Accra')).toContain('Circle');
    });
});

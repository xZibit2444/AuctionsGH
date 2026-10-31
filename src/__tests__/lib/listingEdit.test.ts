import { describe, it, expect } from 'vitest';
import { updateListingSchema, specFieldsForCategory } from '@/lib/listingEdit';
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

    it('accepts phone spec fields and treats empty strings as null', () => {
        const r = updateListingSchema.safeParse({ ...base, battery_health: '', sim_type: '', network_lock: '', faults: '' });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.battery_health).toBeNull();
            expect(r.data.sim_type).toBeNull();
            expect(r.data.network_lock).toBeNull();
        }
        const ok = updateListingSchema.safeParse({ ...base, battery_health: '87', sim_type: 'esim', network_lock: 'unlocked', faults: 'Cracked back' });
        expect(ok.success).toBe(true);
        if (ok.success) expect(ok.data.battery_health).toBe(87);
    });

    it('rejects out of range battery health, unknown sim or lock values, and long faults', () => {
        expect(updateListingSchema.safeParse({ ...base, battery_health: 101 }).success).toBe(false);
        expect(updateListingSchema.safeParse({ ...base, battery_health: -1 }).success).toBe(false);
        expect(updateListingSchema.safeParse({ ...base, battery_health: 80.5 }).success).toBe(false);
        expect(updateListingSchema.safeParse({ ...base, sim_type: 'robot' }).success).toBe(false);
        expect(updateListingSchema.safeParse({ ...base, network_lock: 'maybe' }).success).toBe(false);
        expect(updateListingSchema.safeParse({ ...base, faults: 'x'.repeat(501) }).success).toBe(false);
    });
});

describe('specFieldsForCategory', () => {
    it('shows all spec fields for phone categories', () => {
        const all = { storage: true, battery: true, sim: true, lock: true };
        expect(specFieldsForCategory('Phones & Tablets')).toEqual(all);
        expect(specFieldsForCategory('Apple')).toEqual(all);
    });

    it('shows storage and battery but not SIM or lock for computers', () => {
        expect(specFieldsForCategory('Computers & Laptops')).toEqual({ storage: true, battery: true, sim: false, lock: false });
    });

    it('hides phone spec fields for unrelated categories', () => {
        const none = { storage: false, battery: false, sim: false, lock: false };
        for (const c of ['Home & Garden', 'Electronics', 'Vehicles', 'Fashion & Clothing', 'Sports & Outdoors', 'Kids & Baby', 'Health & Beauty', 'Agriculture', 'Other']) {
            expect(specFieldsForCategory(c)).toEqual(none);
        }
        expect(specFieldsForCategory(undefined)).toEqual(none);
    });
});

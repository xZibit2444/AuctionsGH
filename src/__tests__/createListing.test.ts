import { describe, it, expect, vi, beforeEach } from 'vitest';

const db: { inserted: any; notes: any[]; failInsert: boolean } = { inserted: null, notes: [], failInsert: false };
let currentUser: { id: string } | null = null;
let mayWrite = true;

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (name: string) => ({
            insert: (row: any) => ({
                select: () => ({
                    single: async () => db.failInsert
                        ? { data: null, error: { message: 'db down' } }
                        : { data: { id: 'a1', ...(db.inserted = row) }, error: null },
                }),
            }),
        }),
    }),
}));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock('@/lib/phoneRequirement', () => ({
    userMayWrite: async () => mayWrite,
    PHONE_REQUIRED_MESSAGE: 'Add your phone number to your account to continue.',
}));

import { createListingAction } from '@/app/actions/createListing';
import { ITEM_CATEGORIES, GHANA_REGIONS, getLocationsForRegion } from '@/lib/constants';

const brand = ITEM_CATEGORIES[0];
const region = GHANA_REGIONS[0];
const area = getLocationsForRegion(region)[0];
const baseForm = {
    title: 'Apple iPhone 13 Pro Max',
    description: '',
    brand, model: 'iPhone 13 Pro Max', storage_gb: 256,
    condition: 'good', starting_price: 5000, min_increment: 5,
    duration_hours: 0, duration_minutes: 0,
    listing_city: region, meetup_area: area,
    delivery_available: true, inspection_available: true, winner_note: '',
};
const specs = { storage: '', battery: '', sim: '', lock: '', faults: '' };

beforeEach(() => { db.inserted = null; db.notes = []; db.failInsert = false; currentUser = { id: 'u1' }; mayWrite = true; });

describe('createListingAction', () => {
    it('rejects when the account has no phone number, before any insert', async () => {
        mayWrite = false;
        const r = await createListingAction({ form: baseForm, specs, isPermanent: true, allowBuyNow: true });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/phone number/);
        expect(db.inserted).toBeNull();
    });
    it('rejects logged-out and invalid payloads', async () => {
        currentUser = null;
        expect((await createListingAction({ form: baseForm, specs, isPermanent: true, allowBuyNow: true })).error).toBe('Not authenticated');
        currentUser = { id: 'u1' };
        const r = await createListingAction({ form: { ...baseForm, title: 'no' }, specs, isPermanent: true, allowBuyNow: true });
        expect(r.success).toBe(false);
        expect(db.inserted).toBeNull();
    });
    it('inserts a permanent listing owned by the caller', async () => {
        const r = await createListingAction({ form: baseForm, specs, isPermanent: true, allowBuyNow: false });
        expect(r).toEqual({ success: true, auctionId: 'a1' });
        expect(db.inserted).toMatchObject({
            seller_id: 'u1', title: 'Apple iPhone 13 Pro Max',
            ends_at: '2099-12-31T23:59:59.000Z', current_price: 5000, allow_buy_now: false,
        });
    });
    it('computes ends_at from duration for timed auctions and forces buy-now on', async () => {
        const r = await createListingAction({ form: { ...baseForm, duration_hours: 24 }, specs, isPermanent: false, allowBuyNow: false });
        expect(r.success).toBe(true);
        expect(db.inserted.allow_buy_now).toBe(true);
        expect(new Date(db.inserted.ends_at).getTime()).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
    });
    it('rejects a timed auction with zero duration', async () => {
        const r = await createListingAction({ form: baseForm, specs, isPermanent: false, allowBuyNow: true });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/duration/);
    });
    it('surfaces insert failures', async () => {
        db.failInsert = true;
        const r = await createListingAction({ form: baseForm, specs, isPermanent: true, allowBuyNow: true });
        expect(r).toEqual({ success: false, error: 'db down' });
    });
});

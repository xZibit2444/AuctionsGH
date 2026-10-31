/**
 * Controlled-fixture tests for deal-in-progress edit locks.
 * While an offer is accepted or an order is open, title/condition/price (the
 * fields the buyer's order, checkout and receipt render) are locked; all
 * other fields stay editable. Sold listings stay fully locked. No live data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const PERMANENT_ENDS_AT = '2099-12-31T23:59:59.000Z';

const db: {
    listing: Record<string, unknown>;
    acceptedOffer: Record<string, unknown> | null;
    order: Record<string, unknown> | null;
    updates: Record<string, unknown>[];
} = { listing: {}, acceptedOffer: null, order: null, updates: [] };

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'seller-1' } } }) },
    }),
}));
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        from: (name: string) => {
            if (name === 'profiles') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: { is_banned: false, is_super_admin: false } }),
                        }),
                    }),
                };
            }
            if (name === 'auctions') {
                return {
                    select: () => ({
                        eq: () => ({ maybeSingle: async () => ({ data: db.listing }) }),
                    }),
                    update: (patch: Record<string, unknown>) => ({
                        eq: () => {
                            db.updates.push(patch);
                            return Promise.resolve({ error: null });
                        },
                    }),
                };
            }
            if (name === 'auction_offers') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                limit: () => ({ maybeSingle: async () => ({ data: db.acceptedOffer }) }),
                            }),
                        }),
                    }),
                };
            }
            if (name === 'orders') {
                return {
                    select: () => ({
                        eq: () => ({ maybeSingle: async () => ({ data: db.order }) }),
                    }),
                };
            }
            throw new Error('unexpected table ' + name);
        },
    }),
}));

import { updateListingAction, getListingDealState } from '@/app/actions/updateListing';

const BASE_INPUT = {
    title: 'iPhone 17 Pro Max 256GB',
    description: 'Neatly used',
    brand: 'Phones & Tablets',
    condition: 'good',
    price: 12000,
    listing_city: 'Greater Accra',
    meetup_area: 'Osu',
    delivery_available: false,
    inspection_available: true,
} as const;

function baseListing(overrides: Record<string, unknown> = {}) {
    return {
        id: 'a1',
        seller_id: 'seller-1',
        status: 'active',
        bid_count: 0,
        ends_at: PERMANENT_ENDS_AT,
        title: BASE_INPUT.title,
        condition: 'good',
        starting_price: 12000,
        ...overrides,
    };
}

beforeEach(() => {
    db.listing = baseListing();
    db.acceptedOffer = null;
    db.order = null;
    db.updates = [];
});

describe('updateListingAction deal-in-progress locks', () => {
    it('allows non-deal field edits while an offer is accepted', async () => {
        db.acceptedOffer = { id: 'o1', amount: 12000 };
        const res = await updateListingAction('a1', { ...BASE_INPUT, description: 'New description' });
        expect(res.success).toBe(true);
        expect(db.updates[0].description).toBe('New description');
        expect(db.updates[0].title).toBe(BASE_INPUT.title);
    });

    it('rejects a price change while an offer is accepted', async () => {
        db.acceptedOffer = { id: 'o1', amount: 12000 };
        const res = await updateListingAction('a1', { ...BASE_INPUT, price: 11000 });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/price is locked while a deal is in progress/i);
        expect(db.updates).toHaveLength(0);
    });

    it('rejects title and condition changes while an order is open', async () => {
        db.order = { id: 'ord1', status: 'pending_meetup', amount: 12000 };
        const res = await updateListingAction('a1', { ...BASE_INPUT, title: 'iPhone 17 Pro Max 512GB', condition: 'like_new' });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/title, condition are locked/i);
        expect(db.updates).toHaveLength(0);
    });

    it('ignores terminal orders: edits fully allowed after a deal falls through', async () => {
        db.order = { id: 'ord1', status: 'ghosted', amount: 12000 };
        const res = await updateListingAction('a1', { ...BASE_INPUT, price: 11000, title: 'iPhone 17 Pro Max 512GB' });
        expect(res.success).toBe(true);
        expect(db.updates[0].starting_price).toBe(11000);
    });

    it('allows all edits when no deal is in progress', async () => {
        const res = await updateListingAction('a1', { ...BASE_INPUT, price: 11000 });
        expect(res.success).toBe(true);
        expect(db.updates[0].starting_price).toBe(11000);
    });

    it('starting/current price divergence: an unrelated save during a deal writes NO price fields', async () => {
        // starting_price 12900 vs current_price 12000 (agreed): the lock baseline
        // is starting_price (what the form displays), and no price is written at all.
        db.listing = baseListing({ starting_price: 12900 });
        db.acceptedOffer = { id: 'o1', amount: 12000 };
        const res = await updateListingAction('a1', { ...BASE_INPUT, price: 12900, description: 'Typo fix' });
        expect(res.success).toBe(true);
        expect(db.updates[0].description).toBe('Typo fix');
        expect(db.updates[0]).not.toHaveProperty('starting_price');
        expect(db.updates[0]).not.toHaveProperty('current_price');
    });

    it('a real price change during a deal is still rejected against the displayed baseline', async () => {
        db.listing = baseListing({ starting_price: 12900 });
        db.acceptedOffer = { id: 'o1', amount: 12000 };
        const res = await updateListingAction('a1', { ...BASE_INPUT, price: 12500 });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/price is locked while a deal is in progress/i);
        expect(db.updates).toHaveLength(0);
    });

    it('keeps sold listings fully locked', async () => {
        db.listing = baseListing({ status: 'sold' });
        const res = await updateListingAction('a1', { ...BASE_INPUT, description: 'x' });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/has been sold/i);
        expect(db.updates).toHaveLength(0);
    });
});

describe('getListingDealState', () => {
    it('reports the agreed price from the open order first, else the accepted offer', async () => {
        db.acceptedOffer = { id: 'o1', amount: 12000 };
        db.order = { id: 'ord1', status: 'pending_meetup', amount: 11500 };
        expect(await getListingDealState('a1')).toEqual({ dealPending: true, agreedPrice: 11500 });
        db.order = null;
        expect(await getListingDealState('a1')).toEqual({ dealPending: true, agreedPrice: 12000 });
        db.acceptedOffer = null;
        expect(await getListingDealState('a1')).toEqual({ dealPending: false, agreedPrice: null });
    });
});

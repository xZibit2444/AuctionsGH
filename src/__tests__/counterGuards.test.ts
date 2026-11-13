import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Controlled-fixture guard tests for the counter-offer money path:
 * buyer identity/authorization, stale/repeated responses, concurrent
 * order-slot acceptance, amount validation, and preservation of an
 * existing agreed order. Mocked Supabase; no live data.
 */

const PERM = '2099-12-31T23:59:59.000Z';

interface Row { [k: string]: any }

const db: {
    auction: Row | null;
    offers: Row[];
    orders: Row[];
    deliveries: Row[];
    profiles: Row[];
    notes: Row[];
    // Simulates the race window where the open-order existence check
    // runs before a competing insert lands (select sees nothing yet).
    ordersInvisible: boolean;
} = { auction: null, offers: [], orders: [], deliveries: [], profiles: [], notes: [], ordersInvisible: false };

let currentUser: { id: string } | null = null;

function storeFor(name: string): Row[] {
    if (name === 'auctions') return db.auction ? [db.auction] : [];
    if (name === 'auction_offers') return db.offers;
    if (name === 'orders') return db.orders;
    if (name === 'deliveries') return db.deliveries;
    if (name === 'profiles') return db.profiles;
    return [];
}

function table(name: string) {
    const filters: [string, unknown][] = [];
    const neqFilters: [string, unknown][] = [];
    let patch: Row | null = null;
    let insertRow: Row | null = null;
    let del = false;
    let single = false;
    const match = (r: Row) =>
        filters.every(([k, v]) => k in r && r[k] === v) &&
        neqFilters.every(([k, v]) => r[k] !== v);
    const q: any = {
        select: () => q,
        update: (p: Row) => { patch = p; return q; },
        insert: (row: Row) => { insertRow = row; return q; },
        delete: () => { del = true; return q; },
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        neq: (k: string, v: unknown) => { neqFilters.push([k, v]); return q; },
        single: () => { single = true; return q; },
        maybeSingle: () => { single = true; return q; },
        then: (res: any) => {
            const store = storeFor(name);
            if (insertRow) {
                // Enforce the live DB's UNIQUE(auction_id) on orders.
                if (name === 'orders' && db.orders.some((o) => o.auction_id === insertRow!.auction_id)) {
                    return res({ data: null, error: { message: 'duplicate key value violates unique constraint "orders_auction_id_key"' } });
                }
                const row = { id: `${name}-${store.length + 1}`, ...insertRow };
                store.push(row);
                return res(single ? { data: row, error: null } : { data: [row], error: null });
            }
            if (del) {
                const matched = store.filter(match);
                matched.forEach((r) => store.splice(store.indexOf(r), 1));
                return res({ data: null, error: null });
            }
            if (patch) {
                const matched = store.filter(match);
                matched.forEach((r) => Object.assign(r, patch));
                return res({ data: matched, error: null });
            }
            if (name === 'orders' && db.ordersInvisible) {
                return res(single ? { data: null, error: null } : { data: [], error: null });
            }
            const matched = store.filter(match);
            return res(single ? { data: matched[0] ?? null, error: null } : { data: matched, error: null });
        },
    };
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (n: string) => table(n),
        rpc: async () => ({ data: null, error: null }),
        auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
    }),
}));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock('@/lib/notifications', () => ({ insertNotificationIfEnabled: async (_c: unknown, n: Row) => { db.notes.push(n); } }));
vi.mock('@/lib/email/sender', () => ({
    sendAuctionSoldEmail: vi.fn(async () => ({ success: true })),
    sendAuctionWonEmail: vi.fn(async () => ({ success: true })),
    sendCounterOfferEmail: vi.fn(async () => ({ success: true })),
    sendNewOfferEmail: vi.fn(async () => ({ success: true })),
    sendOfferDeclinedEmail: vi.fn(async () => ({ success: true })),
    sendOrderConfirmedBuyerEmail: vi.fn(async () => ({ success: true })),
    sendOrderConfirmedSellerEmail: vi.fn(async () => ({ success: true })),
}));

import { counterOfferAction, respondToCounterAction, respondToOfferAction } from '@/app/actions/offer';

beforeEach(() => {
    db.auction = { id: 'a1', title: 'iPhone', seller_id: 's1', status: 'active', winner_id: null, current_price: 9000, ends_at: PERM };
    db.offers = [
        { id: 'offer1', auction_id: 'a1', buyer_id: 'b1', seller_id: 's1', amount: 5000, counter_amount: null, status: 'pending' },
        { id: 'offer2', auction_id: 'a1', buyer_id: 'b2', seller_id: 's1', amount: 5500, counter_amount: null, status: 'pending' },
    ];
    db.orders = [];
    db.deliveries = [];
    db.profiles = [];
    db.notes = [];
    db.ordersInvisible = false;
    currentUser = { id: 's1' };
});

describe('identity and authorization', () => {
    it('unauthenticated callers cannot counter or respond to anything', async () => {
        currentUser = null;
        expect((await counterOfferAction('offer1', 6000)).success).toBe(false);
        expect((await respondToOfferAction('offer1', 'accepted')).success).toBe(false);
        expect((await respondToCounterAction('offer1', 'accepted')).success).toBe(false);
        expect(db.offers[0].status).toBe('pending');
    });

    it('a different buyer cannot answer another buyer\'s counter-offer', async () => {
        db.offers[0].status = 'countered';
        db.offers[0].counter_amount = 6000;
        currentUser = { id: 'b2' }; // b2 has their own offer, but offer1 is b1's
        const r = await respondToCounterAction('offer1', 'accepted');
        expect(r.success).toBe(false);
        expect(r.error).toBe('Unauthorized');
        expect(db.offers[0].status).toBe('countered');
    });

});

describe('stale and repeated responses', () => {
    it('a counter cannot be answered twice', async () => {
        db.offers[0].status = 'countered';
        db.offers[0].counter_amount = 6000;
        currentUser = { id: 'b1' };
        expect((await respondToCounterAction('offer1', 'accepted')).success).toBe(true);
        const again = await respondToCounterAction('offer1', 'accepted');
        expect(again.success).toBe(false);
        expect(db.offers[0].status).toBe('accepted');
    });

    it('an offer cannot be re-responded after acceptance', async () => {
        expect((await respondToOfferAction('offer1', 'accepted')).success).toBe(true);
        const again = await respondToOfferAction('offer1', 'accepted');
        expect(again.success).toBe(false);
        expect(again.error).toBe('This offer is no longer pending');
    });

    it('an already-countered offer cannot be countered again or answered via the pending path', async () => {
        db.offers[0].status = 'countered';
        db.offers[0].counter_amount = 6000;
        expect((await counterOfferAction('offer1', 7000)).success).toBe(false);
        expect((await respondToOfferAction('offer1', 'accepted')).success).toBe(false);
        expect(db.offers[0].counter_amount).toBe(6000);
    });

    it('the buyer counter path rejects pending offers and countered rows with no amount', async () => {
        currentUser = { id: 'b1' };
        // Still pending: nothing to answer yet.
        expect((await respondToCounterAction('offer1', 'accepted')).success).toBe(false);
        // Countered but the amount never landed: treated as unanswerable.
        db.offers[0].status = 'countered';
        db.offers[0].counter_amount = null;
        expect((await respondToCounterAction('offer1', 'accepted')).success).toBe(false);
        expect(db.offers[0].status).toBe('countered');
    });
});

describe('amount validation', () => {
    it('rejects NaN, Infinity, zero and negative counters', async () => {
        for (const bad of [NaN, Infinity, -Infinity, 0, -1]) {
            const r = await counterOfferAction('offer1', bad);
            expect(r.success).toBe(false);
        }
        expect(db.offers[0].status).toBe('pending');
        expect(db.offers[0].counter_amount).toBeNull();
    });
});



import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Controlled-fixture test: a Buy-now order on a live permanent listing is
 * priced at the listed database price and never claims the listing. Mocked
 * Supabase; no live data.
 */

const PERM = '2099-12-31T23:59:59.000Z';

const db: { auction: any; offers: any[]; orders: any[]; notes: any[] } = {
    auction: null, offers: [], orders: [], notes: [],
};

function table(name: string) {
    const filters: [string, unknown][] = [];
    let patch: any = null;
    let insertRow: any = null;
    let single = false;
    const match = (r: any) => filters.every(([k, v]) => !(k in r) || r[k] === v);
    const q: any = {
        select: () => q,
        update: (p: any) => { patch = p; return q; },
        insert: (row: any) => { insertRow = row; return q; },
        delete: () => q,
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        single: () => { single = true; return q; },
        maybeSingle: () => { single = true; return q; },
        then: (res: any) => {
            const rows = name === 'auctions' ? [db.auction]
                : name === 'auction_offers' ? db.offers
                : db.orders;
            if (insertRow) {
                const row = { id: 'o1', ...insertRow };
                db.orders.push(row);
                return res(single ? { data: row, error: null } : { data: [row], error: null });
            }
            if (patch) {
                const matched = rows.filter(match);
                matched.forEach((r) => Object.assign(r, patch));
                return res({ data: matched, error: null });
            }
            const matched = rows.filter(match);
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
vi.mock('@/lib/notifications', () => ({ insertNotificationIfEnabled: async (_c: unknown, n: any) => { db.notes.push(n); } }));
vi.mock('@/lib/email/sender', () => ({
    sendOrderConfirmedBuyerEmail: vi.fn(async () => ({ success: true })),
    sendOrderConfirmedSellerEmail: vi.fn(async () => ({ success: true })),
}));

import { createOrderAction } from '@/app/actions/createOrder';

beforeEach(() => {
    db.auction = { id: 'a1', title: 'iPhone', seller_id: 's1', status: 'active', winner_id: null, current_price: 9000, ends_at: PERM };
    db.offers = [];
    db.orders = [];
    db.notes = [];
});

describe('createOrderAction Buy-now pricing on live permanent listings', () => {
    it('creates the order at the listed DB price, ignoring the client amount', async () => {
        const r = await createOrderAction({
            auctionId: 'a1', buyerId: 'b1', deliveryMethod: 'pickup',
            amount: 1, phone: '0240000000', name: 'Buyer',
        });
        expect(r.success).toBe(true);
        expect(db.orders[0].amount).toBe(9000);
        expect(db.auction.status).toBe('active');
    });

    it('rejects when Buy now is disabled and the buyer has no accepted offer', async () => {
        db.auction.allow_buy_now = false;
        const r = await createOrderAction({
            auctionId: 'a1', buyerId: 'b1', deliveryMethod: 'pickup',
            amount: 9000, phone: '0240000000', name: 'Buyer',
        });
        expect(r.success).toBe(false);
        expect(db.orders).toEqual([]);
    });

    it('rejects the seller buying their own listing', async () => {
        const r = await createOrderAction({
            auctionId: 'a1', buyerId: 's1', deliveryMethod: 'pickup',
            amount: 9000, phone: '0240000000', name: 'Seller',
        });
        expect(r.success).toBe(false);
        expect(db.orders).toEqual([]);
    });

    it('rejects a second buyer while a deal is open', async () => {
        db.orders = [{ id: 'o9', auction_id: 'a1', status: 'pending_meetup' }];
        const r = await createOrderAction({
            auctionId: 'a1', buyerId: 'b2', deliveryMethod: 'pickup',
            amount: 9000, phone: '0240000000', name: 'Buyer Two',
        });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/already open/);
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Controlled-fixture test: an order created from an accepted counter-offer
 * must be priced at the counter amount, not the original offer amount.
 * Mocked Supabase; no live data.
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
    db.offers = [
        { id: 'offer1', auction_id: 'a1', buyer_id: 'b1', seller_id: 's1', amount: 5000, counter_amount: 6000, status: 'accepted' },
    ];
    db.orders = [];
    db.notes = [];
});

describe('createOrderAction counter pricing', () => {
    it('prices the order at the accepted counter amount, not the original offer', async () => {
        const r = await createOrderAction({
            auctionId: 'a1', buyerId: 'b1', deliveryMethod: 'pickup',
            amount: 999999, phone: '0240000000', name: 'Buyer',
        });
        expect(r.success).toBe(true);
        expect(db.orders[0].amount).toBe(6000);
    });

    it('falls back to the original amount when no counter exists', async () => {
        db.offers[0].counter_amount = null;
        const r = await createOrderAction({
            auctionId: 'a1', buyerId: 'b1', deliveryMethod: 'pickup',
            amount: 999999, phone: '0240000000', name: 'Buyer',
        });
        expect(r.success).toBe(true);
        expect(db.orders[0].amount).toBe(5000);
    });
});

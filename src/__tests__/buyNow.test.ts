import { describe, it, expect, vi, beforeEach } from 'vitest';

const db: { auction: any; offers: any[]; notes: any[] } = { auction: null, offers: [], notes: [] };
let currentUser: { id: string } | null = null;

function table(name: string) {
    const filters: [string, unknown][] = [];
    const neqFilters: [string, unknown][] = [];
    const inFilters: [string, unknown[]][] = [];
    let patch: any = null;
    let selectCols = '';
    const matchOffer = (o: any) =>
        filters.every(([k, v]) => !(k in o) || o[k] === v) &&
        neqFilters.every(([k, v]) => o[k] !== v) &&
        inFilters.every(([k, vals]) => vals.includes(o[k]));
    const q: any = {
        select: (cols?: string) => { selectCols = cols ?? selectCols; return q; },
        update: (p: any) => { patch = p; return q; },
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        in: (k: string, vals: unknown[]) => { inFilters.push([k, vals]); return q; },
        neq: (k: string, v: unknown) => { neqFilters.push([k, v]); return q; },
        maybeSingle: async () => ({ data: name === 'auctions' ? db.auction : null }),
        then: (res: any) => {
            if (name === 'auctions' && patch) {
                const ok = filters.every(([k, v]) => db.auction[k] === v);
                if (ok) { Object.assign(db.auction, patch); return res({ data: [{ id: db.auction.id }], error: null }); }
                return res({ data: [], error: null });
            }
            if (name === 'auction_offers') {
                if (patch) {
                    const matched = db.offers.filter(matchOffer);
                    matched.forEach(o => Object.assign(o, patch));
                    return res({ data: matched, error: null });
                }
                if (selectCols) return res({ data: db.offers.filter(matchOffer).map((o) => ({ ...o })), error: null });
            }
            return res({ data: null, error: null });
        },
    };
    return q;
}
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (n: string) => table(n),
        auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
    }),
}));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock('@/lib/notifications', () => ({ insertNotificationIfEnabled: async (_c: unknown, n: any) => { db.notes.push(n); } }));
vi.mock('@/lib/email/sender', () => ({ sendAuctionSoldEmail: vi.fn(), sendAuctionWonEmail: vi.fn() }));

import { buyNowAction } from '@/app/actions/buyNow';

const PERM = '2099-12-31T23:59:59.000Z';
beforeEach(() => {
    db.auction = { id: 'a1', title: 'iPhone', seller_id: 's1', status: 'active', ends_at: PERM, current_price: 6600, winner_id: null };
    db.offers = [{ id: 'o0', buyer_id: 'b9', status: 'pending' }];
    db.notes = [];
    currentUser = { id: 'b1' };
});

describe('buyNowAction', () => {
    it('sells at the DB price to the buyer and declines pending offers', async () => {
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        expect(db.auction).toMatchObject({ status: 'sold', winner_id: 'b1', current_price: 6600 });
        expect(db.offers[0].status).toBe('declined');
        expect(db.notes.map(n => n.user_id).sort()).toEqual(['b1', 's1']);
    });
    it('also closes countered offers when the item sells', async () => {
        db.offers = [
            { id: 'o3', buyer_id: 'b4', status: 'countered', counter_amount: 6000 },
        ];
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        expect(db.offers[0].status).toBe('declined');
    });
    it('also closes accepted offers and notifies those buyers the item sold', async () => {
        db.offers = [
            { id: 'o1', buyer_id: 'b2', status: 'accepted' },
            { id: 'o2', buyer_id: 'b3', status: 'pending' },
        ];
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        expect(db.offers.map(o => o.status)).toEqual(['declined', 'declined']);
        const soldElsewhere = db.notes.filter(n => n.title === 'Item Sold to Another Buyer');
        expect(soldElsewhere.map(n => n.user_id)).toEqual(['b2']);
    });
    it('two simultaneous buyers: exactly one wins', async () => {
        const users = ['b1', 'b2'];
        let i = 0;
        currentUser = null;
        const mod = await import('@/lib/supabase/server');
        vi.spyOn(mod, 'createClient').mockImplementation((async () => {
            const id = users[i++ % 2];
            return { auth: { getUser: async () => ({ data: { user: { id } } }) } };
        }) as any);
        const res = await Promise.all([buyNowAction('a1'), buyNowAction('a1')]);
        expect(res.filter(r => r.success).length).toBe(1);
        expect(res.find(r => !r.success)?.error).toMatch(/no longer available|just bought/);
        expect(db.auction.status).toBe('sold');
        vi.restoreAllMocks();
    });
    it('leaves no dangling offers when the item is bought', async () => {
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        expect(db.offers.every(o => o.status === 'declined')).toBe(true);
    });
    it('rejects auctions, own listing, sold items, logged out', async () => {
        db.auction.ends_at = '2026-11-01T00:00:00Z';
        expect((await buyNowAction('a1')).success).toBe(false);
        expect(db.auction.status).toBe('active');
        db.auction.ends_at = PERM;
        currentUser = { id: 's1' };
        expect((await buyNowAction('a1')).error).toMatch(/own listing/);
        currentUser = null;
        expect((await buyNowAction('a1')).error).toMatch(/authenticated/);
        currentUser = { id: 'b1' };
        db.auction.status = 'sold';
        expect((await buyNowAction('a1')).success).toBe(false);
    });
});

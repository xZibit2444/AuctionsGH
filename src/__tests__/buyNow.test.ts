import { describe, it, expect, vi, beforeEach } from 'vitest';

const db: { auction: any; offers: any[]; notes: any[] } = { auction: null, offers: [], notes: [] };
let currentUser: { id: string } | null = null;

function table(name: string) {
    const filters: [string, unknown][] = [];
    let patch: any = null;
    const q: any = {
        select: () => q,
        update: (p: any) => { patch = p; return q; },
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        maybeSingle: async () => ({ data: name === 'auctions' ? db.auction : null }),
        then: (res: any) => {
            if (name === 'auctions' && patch) {
                const ok = filters.every(([k, v]) => db.auction[k] === v);
                if (ok) { Object.assign(db.auction, patch); return res({ data: [{ id: db.auction.id }], error: null }); }
                return res({ data: [], error: null });
            }
            if (name === 'auction_offers' && patch) { db.offers.forEach(o => { if (o.status === 'pending') o.status = patch.status; }); }
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
    db.offers = [{ status: 'pending' }];
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

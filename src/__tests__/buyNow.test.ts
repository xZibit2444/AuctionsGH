import { describe, it, expect, vi, beforeEach } from 'vitest';

const db: { auction: any; offers: any[]; notes: any[] } = { auction: null, offers: [], notes: [] };
let currentUser: { id: string } | null = null;

function table(name: string) {
    const filters: [string, unknown][] = [];
    const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        maybeSingle: async () => ({ data: name === 'auctions' ? db.auction : null }),
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
    it('lets the buyer proceed without taking the listing down', async () => {
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        // Permanent rule: a Buy-now click never claims, reserves or hides the
        // listing - only the seller takes it down.
        expect(db.auction).toMatchObject({ status: 'active', winner_id: null, current_price: 6600, ends_at: PERM });
    });
    it('leaves every open offer untouched for the seller', async () => {
        db.offers = [
            { id: 'o1', buyer_id: 'b2', status: 'accepted' },
            { id: 'o2', buyer_id: 'b3', status: 'pending' },
        ];
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        expect(db.offers.map(o => o.status)).toEqual(['accepted', 'pending']);
    });
    it('sends no sold/reserved notifications or emails at click time', async () => {
        const r = await buyNowAction('a1');
        expect(r.success).toBe(true);
        expect(db.notes).toEqual([]);
    });
    it('two simultaneous buyers both proceed - the first confirmed order wins the deal slot at checkout', async () => {
        const users = ['b1', 'b2'];
        let i = 0;
        currentUser = null;
        const mod = await import('@/lib/supabase/server');
        vi.spyOn(mod, 'createClient').mockImplementation((async () => {
            const id = users[i++ % 2];
            return { auth: { getUser: async () => ({ data: { user: { id } } }) } };
        }) as any);
        const res = await Promise.all([buyNowAction('a1'), buyNowAction('a1')]);
        expect(res.every(r => r.success)).toBe(true);
        expect(db.auction.status).toBe('active');
        vi.restoreAllMocks();
    });
    it('rejects auctions, own listing, sold items, logged out, buy-now disabled, missing price', async () => {
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
        db.auction.status = 'active';
        db.auction.allow_buy_now = false;
        expect((await buyNowAction('a1')).error).toMatch(/not available/);
        db.auction.allow_buy_now = true;
        db.auction.current_price = 0;
        expect((await buyNowAction('a1')).success).toBe(false);
    });
});

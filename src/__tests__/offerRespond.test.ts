import { describe, it, expect, vi, beforeEach } from 'vitest';

const PERM = '2099-12-31T23:59:59.000Z';

const db: { auction: any; offers: any[]; notes: any[] } = { auction: null, offers: [], notes: [] };
let currentUser: { id: string } | null = null;

function table(name: string) {
    const filters: [string, unknown][] = [];
    const neqFilters: [string, unknown][] = [];
    let patch: any = null;
    let single = false;
    const match = (r: any) =>
        filters.every(([k, v]) => !(k in r) || r[k] === v) &&
        neqFilters.every(([k, v]) => r[k] !== v);
    const q: any = {
        select: () => q,
        update: (p: any) => { patch = p; return q; },
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        neq: (k: string, v: unknown) => { neqFilters.push([k, v]); return q; },
        single: () => { single = true; return q; },
        maybeSingle: () => { single = true; return q; },
        then: (res: any) => {
            const rows = name === 'auctions' ? [db.auction] : db.offers;
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
        auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
    }),
}));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));
vi.mock('@/lib/notifications', () => ({ insertNotificationIfEnabled: async (_c: unknown, n: any) => { db.notes.push(n); } }));
vi.mock('@/lib/email/sender', () => ({
    sendAuctionSoldEmail: vi.fn(async () => ({ success: true })),
    sendAuctionWonEmail: vi.fn(async () => ({ success: true })),
    sendNewOfferEmail: vi.fn(async () => ({ success: true })),
    sendOfferDeclinedEmail: vi.fn(async () => ({ success: true })),
}));

import { respondToOfferAction } from '@/app/actions/offer';

beforeEach(() => {
    db.auction = { id: 'a1', title: 'iPhone', status: 'active', ends_at: PERM };
    db.offers = [
        { id: 'offer1', auction_id: 'a1', buyer_id: 'b1', seller_id: 's1', amount: 5000, status: 'pending' },
        { id: 'offer2', auction_id: 'a1', buyer_id: 'b2', seller_id: 's1', amount: 4800, status: 'pending' },
    ];
    db.notes = [];
    currentUser = { id: 's1' };
});

describe('respondToOfferAction', () => {
    it('permanent listing: accepting an offer keeps the listing live and other offers open', async () => {
        const r = await respondToOfferAction('offer1', 'accepted');
        expect(r.success).toBe(true);
        expect(db.offers.find((o) => o.id === 'offer1').status).toBe('accepted');
        // Listing stays on the market - an accepted offer is not a sale
        expect(db.auction.status).toBe('active');
        expect(db.auction.ends_at).toBe(PERM);
        expect(db.auction.winner_id).toBeUndefined();
        // Other buyers' pending offers stay open
        expect(db.offers.find((o) => o.id === 'offer2').status).toBe('pending');
        const buyerNote = db.notes.find((n) => n.user_id === 'b1');
        expect(buyerNote.body).toMatch(/stays live until an order is completed/);
    });

    it('timed auction: accepting an offer closes the auction and declines other offers', async () => {
        db.auction.ends_at = '2026-11-01T00:00:00.000Z';
        const r = await respondToOfferAction('offer1', 'accepted');
        expect(r.success).toBe(true);
        expect(db.auction.status).toBe('sold');
        expect(db.auction.winner_id).toBe('b1');
        expect(db.auction.current_price).toBe(5000);
        expect(db.offers.find((o) => o.id === 'offer2').status).toBe('declined');
    });

    it('declining an offer never touches the listing', async () => {
        const r = await respondToOfferAction('offer1', 'declined');
        expect(r.success).toBe(true);
        expect(db.auction.status).toBe('active');
        expect(db.offers.find((o) => o.id === 'offer1').status).toBe('declined');
    });
});

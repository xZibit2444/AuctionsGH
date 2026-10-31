import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Controlled-fixture tests for counter-offers. Mocked Supabase; no live data.
 */

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
    sendCounterOfferEmail: vi.fn(async () => ({ success: true })),
    sendNewOfferEmail: vi.fn(async () => ({ success: true })),
    sendOfferDeclinedEmail: vi.fn(async () => ({ success: true })),
}));

import { counterOfferAction, respondToCounterAction, respondToOfferAction } from '@/app/actions/offer';

beforeEach(() => {
    db.auction = { id: 'a1', title: 'iPhone', status: 'active', ends_at: PERM };
    db.offers = [
        { id: 'offer1', auction_id: 'a1', buyer_id: 'b1', seller_id: 's1', amount: 5000, status: 'pending' },
    ];
    db.notes = [];
    currentUser = { id: 's1' };
});

describe('counterOfferAction', () => {
    it('seller counters a pending offer: status countered, counter_amount set, buyer notified', async () => {
        const r = await counterOfferAction('offer1', 6000);
        expect(r.success).toBe(true);
        const o = db.offers[0];
        expect(o.status).toBe('countered');
        expect(o.counter_amount).toBe(6000);
        expect(o.amount).toBe(5000); // original offer amount untouched
        const note = db.notes.find((n) => n.user_id === 'b1');
        expect(note.body).toMatch(/6,000/);
        expect(note.body).toMatch(/5,000/);
    });

    it('rejects a counter equal to the original offer', async () => {
        const r = await counterOfferAction('offer1', 5000);
        expect(r.success).toBe(false);
        expect(db.offers[0].status).toBe('pending');
    });

    it('rejects invalid amounts and non-pending offers', async () => {
        expect((await counterOfferAction('offer1', 0)).success).toBe(false);
        expect((await counterOfferAction('offer1', -100)).success).toBe(false);
        db.offers[0].status = 'accepted';
        expect((await counterOfferAction('offer1', 6000)).success).toBe(false);
    });

    it('buyer cannot counter (seller only)', async () => {
        currentUser = { id: 'b1' };
        const r = await counterOfferAction('offer1', 6000);
        expect(r.success).toBe(false);
        expect(r.error).toBe('Unauthorized');
    });
});

describe('respondToCounterAction', () => {
    beforeEach(() => {
        db.offers[0].status = 'countered';
        db.offers[0].counter_amount = 6000;
        currentUser = { id: 'b1' };
    });

    it('buyer accepts: agreed price is the counter, permanent listing stays live', async () => {
        const r = await respondToCounterAction('offer1', 'accepted');
        expect(r.success).toBe(true);
        expect(db.offers[0].status).toBe('accepted');
        expect(db.auction.status).toBe('active');
        const note = db.notes.find((n) => n.user_id === 'b1' && n.title === 'Your Offer Was Accepted!');
        expect(note.body).toMatch(/6,000/);
        expect(note.body).not.toMatch(/5,000/);
    });

    it('buyer declines: seller notified, listing stays live', async () => {
        const r = await respondToCounterAction('offer1', 'declined');
        expect(r.success).toBe(true);
        expect(db.offers[0].status).toBe('declined');
        expect(db.auction.status).toBe('active');
        const note = db.notes.find((n) => n.user_id === 's1');
        expect(note.body).toMatch(/6,000/);
    });

    it('seller cannot answer the counter; pending-only respondToOfferAction rejects countered', async () => {
        currentUser = { id: 's1' };
        expect((await respondToCounterAction('offer1', 'accepted')).success).toBe(false);
        expect((await respondToOfferAction('offer1', 'accepted')).success).toBe(false);
    });
});

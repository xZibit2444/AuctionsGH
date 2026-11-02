import { describe, it, expect, vi, beforeEach } from 'vitest';

const db: { auction: any; offers: any[]; notes: any[] } = { auction: null, offers: [], notes: [] };

function table(name: string) {
    const filters: [string, unknown][] = [];
    const neqFilters: [string, unknown][] = [];
    const inFilters: [string, unknown[]][] = [];
    let patch: any = null;
    let selectCols = '';
    const match = (r: any) =>
        filters.every(([k, v]) => !(k in r) || r[k] === v) &&
        neqFilters.every(([k, v]) => r[k] !== v) &&
        inFilters.every(([k, vals]) => vals.includes(r[k]));
    const q: any = {
        select: (cols?: string) => { selectCols = cols ?? selectCols; return q; },
        update: (p: any) => { patch = p; return q; },
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        neq: (k: string, v: unknown) => { neqFilters.push([k, v]); return q; },
        in: (k: string, vals: unknown[]) => { inFilters.push([k, vals]); return q; },
        maybeSingle: async () => ({ data: name === 'auctions' ? db.auction : null }),
        then: (res: any) => {
            const rows = name === 'auctions' ? [db.auction] : db.offers;
            if (patch) {
                const matched = rows.filter(match);
                matched.forEach((r) => Object.assign(r, patch));
                if (name === 'auctions') return res({ data: matched.map(() => ({ id: db.auction.id, title: db.auction.title })), error: null });
                return res({ data: matched, error: null });
            }
            const matched = rows.filter(match);
            return res({ data: selectCols ? matched.map((r) => ({ ...r })) : null, error: null });
        },
    };
    return q;
}

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({ from: (n: string) => table(n) }),
}));
vi.mock('@/lib/notifications', () => ({ insertNotificationIfEnabled: async (_c: unknown, n: any) => { db.notes.push(n); } }));

import { finalizeListingSaleIfActive } from '@/lib/finalizeListingSale';

beforeEach(() => {
    db.auction = { id: 'a1', title: 'Sofa', status: 'active', ends_at: '2099-12-31T23:59:59.000Z' };
    db.offers = [
        { id: 'o1', auction_id: 'a1', buyer_id: 'b1', status: 'accepted' },
        { id: 'o2', auction_id: 'a1', buyer_id: 'b2', status: 'accepted' },
        { id: 'o3', auction_id: 'a1', buyer_id: 'b3', status: 'pending' },
    ];
    db.notes = [];
});

describe('finalizeListingSaleIfActive', () => {
    it('keeps a permanent listing live on order completion and leaves offers open', async () => {
        await finalizeListingSaleIfActive('a1', 'b1');
        expect(db.auction.status).toBe('active');
        expect(db.auction.winner_id).toBeUndefined();
        expect(db.auction.ends_at).toBe('2099-12-31T23:59:59.000Z');
        expect(db.offers.map((o) => o.status)).toEqual(['accepted', 'accepted', 'pending']);
        expect(db.notes).toEqual([]);
    });

    it('is a no-op for listings already sold (timed auctions, legacy Buy-now)', async () => {
        db.auction.status = 'sold';
        db.auction.winner_id = 'b9';
        await finalizeListingSaleIfActive('a1', 'b1');
        expect(db.auction.winner_id).toBe('b9');
        expect(db.offers.every((o) => o.status !== 'declined')).toBe(true);
        expect(db.notes).toEqual([]);
    });

    it('still finalizes a legacy non-permanent listing that is somehow active at order completion', async () => {
        db.auction.ends_at = '2026-11-01T00:00:00.000Z';
        await finalizeListingSaleIfActive('a1', 'b1');
        expect(db.auction.status).toBe('sold');
        expect(db.auction.winner_id).toBe('b1');
        expect(db.offers.find((o) => o.id === 'o1').status).toBe('accepted'); // completing buyer keeps theirs
        expect(db.offers.find((o) => o.id === 'o2').status).toBe('declined');
        expect(db.offers.find((o) => o.id === 'o3').status).toBe('declined');
    });
});

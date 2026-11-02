import { describe, expect, it, vi } from 'vitest';
import { listingDetailId, isListingUuid } from '@/lib/listingRoute';
const fx = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], error: null as null | { message: string } }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'in', 'order']) q[method] = () => q;
    for (const method of ['range', 'limit']) q[method] = async () => ({ data: fx.rows, error: fx.error });
    return q;
} }) }));
import { getPublicBrowse } from '@/lib/publicBrowse';

describe('public browse seeds and listing route guards', () => {
    it('does not apply listing detail404 checks to create/edit/API routes', () => {
        expect(listingDetailId('/auctions/create')).toBeNull();
        expect(listingDetailId('/auctions/abc/edit')).toBeNull();
        expect(listingDetailId('/api/auctions/abc')).toBeNull();
        expect(listingDetailId('/auctions/abc')).toBe('abc');
        expect(isListingUuid('abc')).toBe(false);
        expect(isListingUuid('916cab8f-4e21-4606-b93e-ce8bacf56149')).toBe(true);
    });
    it('matches permanent/auction classification and 48h sold retention', async () => {
        fx.rows = [
            { id: 'p', ends_at: '2099-12-31', status: 'active' },
            { id: 'a', ends_at: '2026-11-04', status: 'active' },
            { id: 's', ends_at: '2026-11-01', status: 'sold', bid_count: 0, updated_at: new Date().toISOString() },
            { id: 'old', ends_at: '2099-12-31', status: 'sold', updated_at: '2000-01-01' },
        ];
        fx.error = null;
        expect((await getPublicBrowse('permanent'))?.map(x => x.id).sort()).toEqual(['p', 's']);
        expect((await getPublicBrowse('auction'))?.map(x => x.id)).toEqual(['a']);
    });
    it('lets existing client fetching handle database failures instead of showing a false empty grid', async () => {
        fx.error = { message: 'temporary' };
        expect(await getPublicBrowse('permanent')).toBeUndefined();
    });
});

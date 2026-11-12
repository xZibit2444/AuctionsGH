// @vitest-environment jsdom
/**
 * Controlled-fixture render tests for the /offers/[id] deal page.
 * Supabase client, auth and navigation are mocked; fixtures drive the states.
 * No live data. Run with: npx vitest run
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const h = vi.hoisted(() => ({
    offer: null as Record<string, unknown> | null,
    order: null as Record<string, unknown> | null,
    messages: [] as Array<Record<string, unknown>>,
    userId: 'seller1',
    replacedTo: null as string | null,
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: (table: string) => {
            if (table === 'auction_offers') {
                const q: Record<string, unknown> = {};
                q.select = () => q;
                q.eq = () => q;
                q.maybeSingle = () => Promise.resolve({ data: h.offer, error: null });
                return q;
            }
            if (table === 'orders') {
                const q: Record<string, unknown> = {};
                q.select = () => q;
                q.eq = () => q;
                q.maybeSingle = () => Promise.resolve({ data: h.order, error: null });
                return q;
            }
            if (table === 'auction_offer_messages') {
                const q: Record<string, unknown> = {};
                q.select = () => q;
                q.eq = () => q;
                q.order = () => Promise.resolve({ data: h.messages });
                return q;
            }
            throw new Error(`unexpected table ${table}`);
        },
        channel: () => {
            const c: Record<string, unknown> = {};
            c.on = () => c;
            c.subscribe = () => c;
            return c;
        },
        removeChannel: () => ({}),
    }),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
        replace: vi.fn((url: string) => { h.replacedTo = url; }),
    }),
}));
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: h.userId }, loading: false }),
}));

import OfferDealPage from '@/app/offers/[id]/page';

const acceptedOffer = {
    id: 'offer1', auction_id: 'a1', buyer_id: 'buyer1', seller_id: 'seller1',
    amount: 3300, counter_amount: null, status: 'accepted', created_at: '2026-11-12T01:38:00Z',
    auction: { id: 'a1', title: 'iPhone 14 128GB White', condition: 'Used', auction_images: [] },
    buyer: { id: 'buyer1', full_name: 'Reagan Sam', username: 'reagan', avatar_url: null, is_verified: false },
    seller: { id: 'seller1', full_name: 'Jason Tieku', username: 'jnytieku', avatar_url: null, is_verified: true },
};

let root: Root | undefined;
let container: HTMLDivElement;

async function render() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(<OfferDealPage params={Promise.resolve({ id: 'offer1' })} />);
    });
    await act(async () => { await Promise.resolve(); });
}

describe('Offer deal page (/offers/[id])', () => {
    beforeEach(() => {
        h.offer = { ...acceptedOffer };
        h.order = null;
        h.messages = [];
        h.replacedTo = null;
    });

    afterEach(async () => {
        if (root) {
            const r = root;
            root = undefined;
            await act(async () => { r.unmount(); });
        }
        document.body.innerHTML = '';
    });

    it('seller sees the deal room with chat and the awaiting-confirmation note', async () => {
        h.userId = 'seller1';
        await render();
        const text = container!.textContent ?? '';
        expect(text).toContain('Order & Chat');
        expect(text).toContain('Awaiting Buyer Confirmation');
        expect(text).toContain('Reagan');
        expect(text).toContain('3,300');
        expect(container!.querySelector('input[placeholder="Message Reagan…"]')).not.toBeNull();
        expect(text).toContain('collection code');
    });

    it('buyer sees the confirm-order step and seller chat', async () => {
        h.userId = 'buyer1';
        await render();
        const text = container!.textContent ?? '';
        expect(text).toContain('Confirm Your Order');
        const confirm = container!.querySelector('a[href="/checkout/a1"]');
        expect(confirm).not.toBeNull();
        expect(text).toContain('6-digit collection code');
        expect(container!.querySelector('input[placeholder="Message the seller…"]')).not.toBeNull();
    });

    it('shows the existing thread history', async () => {
        h.userId = 'seller1';
        h.messages = [{
            id: 'm1', auction_id: 'a1', buyer_id: 'buyer1', seller_id: 'seller1',
            sender_id: 'seller1', body: 'Hello bro, when will you like to pick it up?',
            created_at: '2026-11-12T06:34:00Z',
        }];
        await render();
        expect(container!.textContent ?? '').toContain('Hello bro, when will you like to pick it up?');
    });

    it('redirects to the order page once an open order exists', async () => {
        h.userId = 'seller1';
        h.order = { id: 'order9', status: 'pending_meetup' };
        await render();
        expect(h.replacedTo).toBe('/orders/order9');
    });

    it('does not redirect for a failed order', async () => {
        h.userId = 'seller1';
        h.order = { id: 'order9', status: 'cancelled_by_buyer' };
        await render();
        expect(h.replacedTo).toBeNull();
        expect(container!.textContent ?? '').toContain('Order & Chat');
    });

    it('blocks non-parties', async () => {
        h.userId = 'stranger';
        await render();
        expect(container!.textContent ?? '').toContain('Deal Not Found');
    });
});

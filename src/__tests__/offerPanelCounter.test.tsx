// @vitest-environment jsdom
/**
 * Controlled-fixture render tests for the counter-offer UI in OfferPanel.
 * Supabase client, navigation and server actions are mocked; fixtures drive
 * the rendered states. No live data. Run with: npx vitest run
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const h = vi.hoisted(() => ({
    offers: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: () => {
                const q: Record<string, unknown> = {};
                q.eq = () => q;
                q.order = () => q;
                q.then = (resolve: (v: { data: unknown[] }) => unknown) =>
                    Promise.resolve({ data: h.offers }).then(resolve);
                return q;
            },
        }),
        channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
        removeChannel: () => ({}),
    }),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/app/actions/offer', () => ({
    makeOfferAction: vi.fn(async () => ({ success: true })),
    counterOfferAction: vi.fn(async () => ({ success: true })),
    respondToCounterAction: vi.fn(async () => ({ success: true })),
    respondToOfferAction: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/app/actions/buyNow', () => ({ buyNowAction: vi.fn(async () => ({ success: true })) }));

import OfferPanel from '@/components/auction/OfferPanel';

let root: Root | undefined;
let container: HTMLDivElement;

async function render(props: { isSeller: boolean }) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(<OfferPanel auctionId="a1" isSeller={props.isSeller} userId="u1" isActive listingPrice={9000} />);
    });
    await act(async () => { await Promise.resolve(); });
}

describe('OfferPanel counter-offer UI', () => {
    beforeEach(() => {
        h.offers = [{
            id: 'offer1', auction_id: 'a1', buyer_id: 'b1', seller_id: 's1',
            amount: 5000, status: 'pending', created_at: '2026-10-31T00:00:00Z',
            buyer_profile: { id: 'b1', full_name: 'Buyer', username: 'buyer' },
        }];
    });

    afterEach(async () => {
        if (root) {
            const r = root;
            root = undefined;
            await act(async () => { r.unmount(); });
        }
        document.body.innerHTML = '';
    });

    it('seller sees Yes/No plus a counter input on a pending offer', async () => {
        await render({ isSeller: true });
        const text = container!.textContent ?? '';
        expect(text).toContain('Yes');
        expect(text).toContain('No');
        const input = container!.querySelector('input[placeholder="Counter (GHS)"]');
        expect(input).not.toBeNull();
        const buttons = [...container!.querySelectorAll('button')].map((b) => b.textContent?.trim());
        expect(buttons).toContain('Counter');
    });

    it('buyer sees the counter amount with Accept/Decline on a countered offer', async () => {
        h.offers = [{ ...h.offers[0], status: 'countered', counter_amount: 6000 }];
        await render({ isSeller: false });
        const text = container!.textContent ?? '';
        expect(text).toContain('Seller countered: GHS 6,000');
        expect(text).toContain('Accept GHS 6,000');
        expect(text).toContain('Decline');
    });

    it('seller sees waiting copy on their own countered offer', async () => {
        h.offers = [{ ...h.offers[0], status: 'countered', counter_amount: 6000 }];
        await render({ isSeller: true });
        expect(container!.textContent ?? '').toContain('Counter sent: GHS 6,000 - waiting for buyer');
    });
});

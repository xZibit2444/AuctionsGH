// @vitest-environment jsdom
/**
 * Fixture test: a shared browse URL with a reversed price range
 * (min > max) must be normalized on initial load so the filter can
 * never silently match nothing. Mocked hooks; no live data.
 */
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import React from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const captured = vi.hoisted(() => ({ options: [] as any[], params: new URLSearchParams('min=5000&max=1') }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/listings',
    useSearchParams: () => captured.params,
}));
vi.mock('@/hooks/useAuctions', () => ({
    useAuctions: (opts: unknown) => {
        captured.options.push(opts);
        return { auctions: [], loading: false, error: null };
    },
}));
vi.mock('@/components/auction/AuctionGrid', () => ({
    default: () => React.createElement('div'),
}));

import AuctionsPageClient from '@/components/auction/AuctionsPageClient';

describe('browse initial URL normalization', () => {
    it('reversed min/max in the URL is swapped before the query runs', async () => {
        captured.options.length = 0;
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);
        await act(async () => {
            root.render(React.createElement(AuctionsPageClient, { listingType: 'permanent' }));
        });
        const last = captured.options[captured.options.length - 1];
        expect(last.minPrice).toBe(1);
        expect(last.maxPrice).toBe(5000);
        await act(async () => root.unmount());
        container.remove();
    });
});

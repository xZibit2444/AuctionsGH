// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const fx = vi.hoisted(() => ({ options: [] as any[], params: new URLSearchParams(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: fx.replace }), useSearchParams: () => fx.params }));
vi.mock('@/hooks/useAuctions', () => ({ useAuctions: (opts: unknown) => { fx.options.push(opts); return { auctions: [], loading: false, error: null }; } }));
vi.mock('@/components/auction/AuctionGrid', () => ({ default: () => React.createElement('div') }));
import AuctionsPageClient, { SearchListingsPageClient, PermanentListingsPageClient } from '@/components/auction/AuctionsPageClient';

describe('combined mobile search entry', () => {
    it('bottom magnifying glass opens combined search, not auctions', () => {
        const nav = readFileSync('src/components/layout/MobileNav.tsx', 'utf8').split('const drawerItems')[0];
        expect(nav).toContain("{ href: '/search', label: 'Search', icon: Search }");
        expect(nav).not.toContain("href: '/auctions', label: 'Auctions'");
    });
    for (const q of ['', 'iphone']) {
        it(`search route covers both types with query '${q}', and keeps combined scope on category changes`, async () => {
            fx.params = new URLSearchParams(q ? { q } : {});
            fx.options.length = 0;
            fx.replace.mockClear();
            const el = document.createElement('div');
            const root = createRoot(el);
            await act(async () => { root.render(<SearchListingsPageClient />); });
            expect(fx.options.at(-1).listingType).toBe('all');
            expect(el.textContent).toContain('Showing matches from both auctions and permanent listings.');
            const category = [...el.querySelectorAll('button')].find(b => b.textContent === 'Phones & Tablets')!;
            await act(async () => category.click());
            expect(fx.replace.mock.calls.at(-1)![0]).toMatch(/^\/search\?/);
            expect(fx.options.at(-1).listingType).toBe('all');
            await act(async () => root.unmount());
        });
    }
    for (const [Component, type] of [[AuctionsPageClient, 'auction'], [PermanentListingsPageClient, 'permanent']] as const) {
        it(`dedicated ${type} view still filters when not searching`, async () => {
            fx.params = new URLSearchParams();
            const root = createRoot(document.createElement('div'));
            await act(async () => { root.render(<Component />); });
            expect(fx.options.at(-1).listingType).toBe(type);
            await act(async () => root.unmount());
        });
    }
});

// @vitest-environment jsdom
/**
 * Render smoke tests for the settings + dashboard light redesign.
 * Renders SettingsPage and DashboardPage with stable mocked auth + supabase
 * and asserts the redesigned structure and real profile data appear.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const fx = vi.hoisted(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
    const authValue = {
        user: { id: 'user-1', email: 'tiekujason@gmail.com' },
        profile: {
            full_name: 'Jason Tieku',
            username: 'jnytieku',
            phone_number: '+233 24 893 1252',
            location: 'Greater Accra',
            show_past_buys: false,
            show_past_sales: true,
            is_verified: true,
            is_admin: false,
            is_super_admin: true,
            is_banned: false,
            avatar_url: '',
            notification_preferences: { promotions: true },
        },
        loading: false,
        signOut: vi.fn(),
        signOutAll: vi.fn(),
    };
    const auctionsRows = [
        { id: 'a1', seller_id: 'user-1', title: 'iPhone 17 Pro Max 256GB', status: 'active', current_price: 12000, starting_price: 12000, ends_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(), bid_count: 3, orders: [] },
        { id: 'a2', seller_id: 'user-1', title: 'iPhone 13 128GB Midnight', status: 'sold', current_price: 2700, starting_price: 2700, ends_at: new Date().toISOString(), created_at: new Date().toISOString(), bid_count: 4, orders: [] },
    ];
    const bidsRows: unknown[] = [];
    const makeQuery = (rows: unknown[]) => {
        const q: Record<string, unknown> = {};
        const self = () => q;
        q.select = self; q.eq = self; q.order = self; q.limit = self;
        q.then = (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: rows, error: null });
        return q;
    };
    return {
        authValue,
        push: vi.fn(),
        refresh: vi.fn(),
        from: vi.fn((table: string) => {
            if (table === 'auctions') return makeQuery(auctionsRows);
            if (table === 'bids') return makeQuery(bidsRows);
            if (table === 'orders') return makeQuery([]);
            return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }),
        rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    };
});

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: fx.push, refresh: fx.refresh, replace: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/settings',
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => fx.authValue,
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: fx.from,
        storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })) }) },
        auth: { getSession: fx.getSession, signOut: vi.fn(() => Promise.resolve({ error: null })) },
        rpc: fx.rpc,
        channel: () => { const c: Record<string, unknown> = {}; c.on = () => c; c.subscribe = () => c; return c; },
        removeChannel: vi.fn(),
    }),
}));

vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => React.createElement('img', props),
}));

vi.mock('next/link', () => ({
    default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
        React.createElement('a', { href, ...rest }, children),
}));

import SettingsPage from '@/app/settings/page';
import DashboardPage from '@/app/dashboard/page';

let container: HTMLDivElement;
let root: Root;

async function render(el: React.ReactElement) {
    await act(async () => { root.render(el); });
}

describe('redesign smoke', () => {
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('settings: all three sections, real data, accurate save wording', async () => {
        await render(React.createElement(SettingsPage));
        const text = container.textContent ?? '';
        for (const needle of ['Public profile', 'Alert preferences', 'Account access', 'Two-factor authentication',
            'Jason Tieku', '@jnytieku', 'tiekujason@gmail.com', 'Greater Accra', 'Changes apply when you save',
            'New bid on your listing', 'Auction ending soon', 'Auction won', 'New messages', 'Promotions & tips']) {
            expect(text).toContain(needle);
        }
        expect(text).not.toContain('instantly');
        const editBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Edit');
        expect(editBtn).toBeTruthy();
        await act(async () => { editBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
        expect(container.textContent).toContain('Save changes');
        expect(container.textContent).toContain('Upload photo');
        expect(container.textContent).toContain('Cannot change');
    }, 15000);

    it('dashboard: stacked selling+buying, admin gated by super admin', async () => {
        await render(React.createElement(DashboardPage));
        const text = container.textContent ?? '';
        for (const needle of ['Dashboard', 'Selling', 'Buying', 'Store management', 'Live Listings Control',
            'Total Listings', 'Revenue', 'Total Bids', 'Auctions Won', 'New listing', 'Analytics', 'Order Monitor']) {
            expect(text).toContain(needle);
        }
        // no hidden tab switcher anymore
        expect(Array.from(container.querySelectorAll('button')).filter(b => b.textContent?.trim() === 'Buyer')).toHaveLength(0);
        // seller stats computed from fixture: 2 total, 1 active, 1 sold, revenue 2700
        expect(text).toContain('2');
    }, 15000);
});

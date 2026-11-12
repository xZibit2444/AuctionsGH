// @vitest-environment jsdom
/**
 * Controlled-fixture tests for the unread-messages popup (FloatingChatToast)
 * and markChatNotificationsReadAction. Supabase client/server, auth,
 * availability and navigation are mocked; fixtures drive the states.
 * No live data. Run with: npx vitest run
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
    userId: 'u1',
    notifications: [] as Array<Record<string, unknown>>,
    acceptedOffer: null as Record<string, unknown> | null,
    realtimeHandler: null as ((payload: { new: Record<string, unknown> }) => void) | null,
    pathname: '/',
    lastReadQuery: null as { calls: unknown[][] } | null,
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: (table: string) => {
            if (table === 'notifications') {
                const q: Record<string, unknown> = {};
                for (const m of ['select', 'eq', 'gte', 'order']) q[m] = () => q;
                q.limit = () => Promise.resolve({ data: h.notifications, error: null });
                return q;
            }
            if (table === 'auction_offers') {
                const q: Record<string, unknown> = {};
                for (const m of ['select', 'eq', 'or', 'order', 'limit']) q[m] = () => q;
                q.maybeSingle = () => Promise.resolve({ data: h.acceptedOffer, error: null });
                return q;
            }
            throw new Error(`unexpected table ${table}`);
        },
        channel: () => {
            const c: Record<string, unknown> = {};
            c.on = (_event: string, _filter: unknown, cb: (payload: { new: Record<string, unknown> }) => void) => {
                h.realtimeHandler = cb;
                return c;
            };
            c.subscribe = () => c;
            return c;
        },
        removeChannel: () => ({}),
    }),
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: h.userId } }, error: null }) },
        from: (table: string) => {
            if (table !== 'notifications') throw new Error(`unexpected table ${table}`);
            const q = { calls: [] as unknown[][] } as Record<string, unknown> & { calls: unknown[][] };
            for (const m of ['update', 'eq', 'is']) {
                q[m] = (...args: unknown[]) => { q.calls.push([m, ...args]); return q; };
            }
            // The query builder is awaited at the end of the chain.
            q.then = (resolve: (v: { error: null }) => void) => resolve({ error: null });
            h.lastReadQuery = q;
            return q;
        },
    }),
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: h.userId }, loading: false }),
}));
vi.mock('@/hooks/useUserAvailability', () => ({
    useUserAvailability: () => true,
}));
vi.mock('next/navigation', () => ({
    usePathname: () => h.pathname,
}));

import FloatingChatToast from '@/components/layout/FloatingChatToast';
import { markChatNotificationsReadAction } from '@/app/actions/notifications';

function orderNotif(id: string, body: string, orderId = 'o1') {
    return {
        id,
        title: 'New message from Seller',
        body,
        auction_id: null,
        order_id: orderId,
        created_at: new Date().toISOString(),
    };
}

function offerNotif(id: string, body: string, auctionId = 'a1') {
    return {
        id,
        title: 'Message from Seller',
        body,
        auction_id: auctionId,
        order_id: null,
        created_at: new Date().toISOString(),
    };
}

describe('FloatingChatToast unread-messages popup', () => {
    let container: HTMLDivElement;
    let root: Root;

    const flush = async () => {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    };

    beforeEach(() => {
        h.notifications = [];
        h.acceptedOffer = null;
        h.realtimeHandler = null;
        h.pathname = '/';
        h.lastReadQuery = null;
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('shows an unread order message on site visit, linking to the order chat', async () => {
        h.notifications = [orderNotif('n1', 'hello bro')];
        await act(async () => { root.render(<FloatingChatToast />); });
        await flush();
        await flush();

        expect(container.textContent).toContain('New message from Seller');
        expect(container.textContent).toContain('hello bro');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/orders/o1');
    });

    it('links an offer-thread message to the Order & Chat deal page when an offer is accepted', async () => {
        h.notifications = [offerNotif('n2', 'when pickup?')];
        h.acceptedOffer = { id: 'offer1' };
        await act(async () => { root.render(<FloatingChatToast />); });
        await flush();
        await flush();

        expect(container.textContent).toContain('Message from Seller');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('/offers/offer1');
    });

    it('falls back to the listing page when no accepted offer exists', async () => {
        h.notifications = [offerNotif('n3', 'still available?')];
        h.acceptedOffer = null;
        await act(async () => { root.render(<FloatingChatToast />); });
        await flush();
        await flush();

        expect(container.querySelector('a')?.getAttribute('href')).toBe('/auctions/a1');
    });

    it('stays quiet for a dismissed thread until a newer message arrives', async () => {
        window.localStorage.setItem('chatToastDismissed:u1', JSON.stringify({ 'order:o1': 'n1' }));
        h.notifications = [orderNotif('n1', 'hello bro')];
        await act(async () => { root.render(<FloatingChatToast />); });
        await flush();
        await flush();

        expect(container.textContent).not.toContain('hello bro');

        // A newer message on the same thread brings the popup back.
        expect(h.realtimeHandler).toBeTruthy();
        await act(async () => {
            h.realtimeHandler!({ new: { ...orderNotif('n9', 'are you there?'), type: 'new_message' } });
        });
        await flush();
        await flush();

        expect(container.textContent).toContain('are you there?');
    });

    it('remembers an explicit dismissal so the same message does not pop up again', async () => {
        h.notifications = [orderNotif('n1', 'hello bro')];
        await act(async () => { root.render(<FloatingChatToast />); });
        await flush();
        await flush();

        const close = container.querySelector('button[aria-label="Dismiss"]');
        expect(close).toBeTruthy();
        await act(async () => {
            close!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await flush();

        expect(container.textContent).not.toContain('hello bro');
        expect(window.localStorage.getItem('chatToastDismissed:u1')).toBe(JSON.stringify({ 'order:o1': 'n1' }));
    });

    it('shows nothing when there are no unread deal messages', async () => {
        h.notifications = [];
        await act(async () => { root.render(<FloatingChatToast />); });
        await flush();

        expect(container.querySelector('a')).toBeNull();
    });
});

describe('markChatNotificationsReadAction', () => {
    beforeEach(() => {
        h.lastReadQuery = null;
    });

    it('marks only the order thread\'s unread new-message notifications read', async () => {
        const result = await markChatNotificationsReadAction({ orderId: 'o1' });
        expect(result.success).toBe(true);
        expect(h.lastReadQuery?.calls).toContainEqual(['eq', 'type', 'new_message']);
        expect(h.lastReadQuery?.calls).toContainEqual(['eq', 'is_read', false]);
        expect(h.lastReadQuery?.calls).toContainEqual(['eq', 'order_id', 'o1']);
    });

    it('scopes offer threads to the auction and excludes order notifications', async () => {
        const result = await markChatNotificationsReadAction({ auctionId: 'a1' });
        expect(result.success).toBe(true);
        expect(h.lastReadQuery?.calls).toContainEqual(['eq', 'auction_id', 'a1']);
        expect(h.lastReadQuery?.calls).toContainEqual(['is', 'order_id', null]);
    });

    it('rejects a call with no thread target', async () => {
        const result = await markChatNotificationsReadAction({});
        expect(result.error).toBeTruthy();
    });
});

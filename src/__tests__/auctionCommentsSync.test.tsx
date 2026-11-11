// @vitest-environment jsdom
/**
 * Regression tests for the "reply disappears until I refresh" bug in
 * AuctionComments. Posting swaps an optimistic placeholder for the saved row
 * twice over: once when the realtime INSERT arrives and again when the server
 * action resolves. When realtime wins the race, the second swap must not
 * delete the row it already placed. Supabase client, navigation and server
 * actions are mocked; fixtures drive the rendered states. No live data.
 * Run with: npx vitest run
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

interface CommentRow {
    id: string;
    auction_id: string;
    user_id: string;
    body: string;
    parent_id: string | null;
    created_at: string;
    profile: { id: string; full_name: string | null; username: string; avatar_url: string | null } | null;
}

const h = vi.hoisted(() => ({
    initialComments: [] as CommentRow[],
    rowsById: {} as Record<string, CommentRow>,
    insertCb: null as null | ((payload: { new: CommentRow }) => void),
    resolveSend: null as null | ((v: { success: boolean; commentId?: string; error?: string }) => void),
}));

const buyer = { id: 'u-buyer', full_name: 'Ekua Eguakun', username: 'ekua', avatar_url: null };
const seller = { id: 'u-jason', full_name: 'Jason Tieku', username: 'jnytieku', avatar_url: null };

const existingComment: CommentRow = {
    id: 'c1',
    auction_id: 'a1',
    user_id: buyer.id,
    body: 'Is this still available?',
    parent_id: null,
    created_at: '2026-11-11T10:00:00.000Z',
    profile: buyer,
};

const savedReply: CommentRow = {
    id: 'c2',
    auction_id: 'a1',
    user_id: seller.id,
    body: 'Yes, it is available',
    parent_id: 'c1',
    created_at: '2026-11-11T10:05:00.000Z',
    profile: seller,
};

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: (table: string) => {
            if (table !== 'auction_comments') throw new Error(`unexpected table ${table}`);
            const state: { id?: string } = {};
            const q: Record<string, unknown> = {};
            q.select = () => q;
            q.eq = (col: string, val: string) => {
                if (col === 'id') state.id = val;
                return q;
            };
            q.order = () => q;
            q.limit = () => q;
            q.maybeSingle = () => Promise.resolve({ data: (state.id && h.rowsById[state.id]) ?? null });
            q.then = (resolve: (v: { data: CommentRow[] }) => unknown) =>
                Promise.resolve({ data: h.initialComments }).then(resolve);
            return q;
        },
        channel: () => ({
            on: (_event: string, _filter: unknown, cb: (payload: { new: CommentRow }) => void) => {
                h.insertCb = cb;
                return { subscribe: () => ({}) };
            },
        }),
        removeChannel: () => ({}),
    }),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
        React.createElement('a', { href, ...rest }, children),
}));

vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => React.createElement('img', props),
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: seller.id }, profile: { ...seller, is_super_admin: false }, loading: false }),
}));

vi.mock('@/app/actions/comments', () => ({
    sendAuctionCommentAction: vi.fn(
        () => new Promise((resolve) => { h.resolveSend = resolve as typeof h.resolveSend; })
    ),
}));

vi.mock('@/app/actions/moderation', () => ({
    deleteAuctionCommentAction: vi.fn(async () => ({ success: true })),
}));

import AuctionComments from '@/components/auction/AuctionComments';

let root: Root | undefined;
let container: HTMLDivElement;

async function render() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(<AuctionComments auctionId="a1" currentUserId={seller.id} />);
    });
    await act(async () => { await Promise.resolve(); });
}

function clickButton(text: string) {
    const btn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim().toLowerCase() === text.toLowerCase()
    );
    expect(btn, `button "${text}"`).toBeTruthy();
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function setBody(text: string) {
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
    setter!.call(textarea, text);
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
}

async function submitReply() {
    await act(async () => {
        clickButton('Reply'); // arm the reply target on the existing comment
    });
    await act(async () => {
        setBody(savedReply.body);
    });
    await act(async () => {
        container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
}

function bodyOccurrences() {
    const matches = container.textContent?.match(new RegExp(savedReply.body.replace(/ /g, '\\s'), 'g'));
    return matches ? matches.length : 0;
}

async function fireRealtimeInsert() {
    await act(async () => {
        h.insertCb!({ new: savedReply });
        await Promise.resolve();
    });
    await act(async () => { await Promise.resolve(); });
}

async function resolveAction() {
    await act(async () => {
        h.resolveSend!({ success: true, commentId: savedReply.id });
        await Promise.resolve();
    });
    await act(async () => { await Promise.resolve(); });
}

describe('AuctionComments optimistic/realtime sync', () => {
    beforeEach(() => {
        h.initialComments = [existingComment];
        h.rowsById = { c1: existingComment, c2: savedReply };
        h.insertCb = null;
        h.resolveSend = null;
    });

    afterEach(() => {
        act(() => root?.unmount());
        container?.remove();
        root = undefined;
    });

    it('keeps the reply visible when realtime delivers it before the server action resolves', async () => {
        await render();
        await submitReply();

        // Placeholder is on screen while the action is in flight.
        expect(container.textContent).toContain('Sending...');

        // Realtime wins the race: the INSERT handler swaps the placeholder for the saved row.
        await fireRealtimeInsert();
        expect(container.textContent).toContain(savedReply.body);
        expect(container.textContent).not.toContain('Sending...');

        // The server action resolves afterwards; the reply must not vanish.
        await resolveAction();
        expect(container.textContent).toContain(savedReply.body);
        expect(bodyOccurrences()).toBe(1);
    });

    it('shows the reply exactly once when the server action resolves before realtime', async () => {
        await render();
        await submitReply();

        await resolveAction();
        expect(container.textContent).toContain(savedReply.body);

        // The realtime INSERT arrives after; it must not add a duplicate.
        await fireRealtimeInsert();
        expect(bodyOccurrences()).toBe(1);
    });
});

// @vitest-environment jsdom
/**
 * Controlled-fixture tests for the browse filter wiring in useAuctions.
 * The Supabase client is mocked with a recording query builder; fixtures
 * drive every assertion so no live data is touched. Run with: npx vitest run
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useAuctions } from '@/hooks/useAuctions';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const rows = [
        {
            id: 'a1',
            title: 'iPhone 15 Pro',
            status: 'active',
            ends_at: '2120-01-01T00:00:00.000Z',
            bid_count: 0,
            brand: 'Apple',
            condition: 'like_new',
            storage_gb: 128,
            current_price: 5000,
            delivery_available: true,
            auction_images: [],
            listing_videos: [],
        },
    ];
    return { calls, rows };
});

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        channel: () => ({
            on: () => ({ subscribe: () => ({}) }),
        }),
        removeChannel: () => ({}),
        from: () => ({
            select: () => {
                const builder: Record<string, unknown> = {};
                for (const m of ['in', 'eq', 'gte', 'lte', 'or', 'order', 'limit']) {
                    builder[m] = (...args: unknown[]) => {
                        h.calls.push({ method: m, args });
                        return builder;
                    };
                }
                builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
                    Promise.resolve({ data: h.rows, error: null }).then(resolve);
                return builder;
            },
        }),
    }),
}));

function HookHost({ options }: { options: Parameters<typeof useAuctions>[0] }) {
    useAuctions(options);
    return null;
}

let root: Root | undefined;
let container: HTMLDivElement;

async function render(options: Parameters<typeof useAuctions>[0]) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(<HookHost options={options} />);
    });
    await act(async () => {
        await Promise.resolve();
    });
}

function filterCalls(method: string) {
    return h.calls.filter((c) => c.method === method).map((c) => c.args);
}

describe('useAuctions browse filters', () => {
    beforeEach(() => {
        h.calls.length = 0;
    });

    afterEach(async () => {
        if (root) {
            const r = root;
            root = undefined;
            await act(async () => {
                r.unmount();
            });
        }
        document.body.innerHTML = '';
    });

    it('maps condition, price range and delivery-only filters onto the query', async () => {
        await render({
            condition: 'like_new',
            minPrice: 1000,
            maxPrice: 8000,
            deliveryAvailable: true,
        });

        expect(filterCalls('eq')).toContainEqual(['condition', 'like_new']);
        expect(filterCalls('gte')).toContainEqual(['current_price', 1000]);
        expect(filterCalls('lte')).toContainEqual(['current_price', 8000]);
        expect(filterCalls('eq')).toContainEqual(['delivery_available', true]);
    });

    it('omits price and delivery filters when unset', async () => {
        await render({});

        expect(filterCalls('gte').filter(([col]) => col === 'current_price')).toHaveLength(0);
        expect(filterCalls('lte')).toHaveLength(0);
        expect(filterCalls('eq').filter(([col]) => col === 'delivery_available')).toHaveLength(0);
        expect(filterCalls('eq').filter(([col]) => col === 'condition')).toHaveLength(0);
    });

    it('ignores non-positive price bounds', async () => {
        await render({ minPrice: 0, maxPrice: -5 });

        expect(filterCalls('gte').filter(([col]) => col === 'current_price')).toHaveLength(0);
        expect(filterCalls('lte')).toHaveLength(0);
    });
});

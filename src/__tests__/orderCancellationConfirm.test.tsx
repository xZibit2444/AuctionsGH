// @vitest-environment jsdom
/**
 * Controlled-fixture tests for the order cancellation two-step confirmation.
 * Regression-safety repair: a single stray click on "Cancel order" must never
 * submit a real cancellation. Eligibility, policies and reason choices are
 * unchanged; only an explicit confirm step is added. Run with: npx vitest run
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const fx = vi.hoisted(() => {
    return {
        cancelOrderAction: vi.fn(),
        refresh: vi.fn(),
    };
});

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: fx.refresh, push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/app/actions/cancelOrder', () => ({
    cancelOrderAction: fx.cancelOrderAction,
}));

import OrderCancellationPanel from '@/components/order/OrderCancellationPanel';

let container: HTMLDivElement;
let root: Root;

function renderPanel(props: Partial<React.ComponentProps<typeof OrderCancellationPanel>> = {}) {
    act(() => {
        root.render(
            React.createElement(OrderCancellationPanel, {
                orderId: 'order-1',
                status: 'pending_meetup',
                isBuyer: false,
                isPermanent: true,
                canCancel: true,
                ...props,
            })
        );
    });
}

function clickButton(match: RegExp) {
    const btn = Array.from(container.querySelectorAll('button')).find((b) => match.test(b.textContent || ''));
    expect(btn, `button matching ${match}`).toBeTruthy();
    act(() => {
        btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    return btn!;
}

async function flush() {
    await act(async () => {
        await Promise.resolve();
    });
}

beforeEach(() => {
    fx.cancelOrderAction.mockReset();
    fx.refresh.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe('OrderCancellationPanel confirmation step', () => {
    it('does NOT call the cancel action on the first "Cancel order" click', () => {
        renderPanel();
        clickButton(/^Cancel order$/);
        expect(fx.cancelOrderAction).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Cancel this order? This cannot be undone.');
    });

    it('shows the seller consequence (listing taken down) in the confirm box', () => {
        renderPanel({ isBuyer: false });
        clickButton(/^Cancel order$/);
        expect(container.textContent).toContain('The listing will be taken down.');
    });

    it('"Keep order" backs out without calling the action', () => {
        renderPanel();
        clickButton(/^Cancel order$/);
        clickButton(/^Keep order$/);
        expect(fx.cancelOrderAction).not.toHaveBeenCalled();
        expect(container.textContent).not.toContain('Cancel this order? This cannot be undone.');
    });

    it('"Yes, cancel order" submits with the selected reason and shows permanent-aware seller copy', async () => {
        fx.cancelOrderAction.mockResolvedValue({ success: true, status: 'cancelled_by_seller', auctionAction: 'cancelled' });
        renderPanel({ isBuyer: false });
        clickButton(/^Cancel order$/);
        clickButton(/^Yes, cancel order$/);
        await flush();
        expect(fx.cancelOrderAction).toHaveBeenCalledTimes(1);
        expect(fx.cancelOrderAction).toHaveBeenCalledWith({ orderId: 'order-1', reason: 'item_unavailable', note: '' });
        expect(container.textContent).toContain('Order cancelled successfully. The listing was taken down.');
    });

    it('buyer on a permanent listing sees "reopen for other buyers" in confirm and success copy', async () => {
        fx.cancelOrderAction.mockResolvedValue({ success: true, status: 'cancelled_by_buyer', auctionAction: 'reopened' });
        renderPanel({ isBuyer: true, isPermanent: true });
        clickButton(/^Cancel order$/);
        expect(container.textContent).toContain('The listing will reopen for other buyers.');
        expect(container.textContent).not.toContain('reopen for 24 hours');
        clickButton(/^Yes, cancel order$/);
        await flush();
        expect(container.textContent).toContain('The listing was reopened for other buyers.');
    });

    it('buyer on a timed listing keeps the 24-hour copy', async () => {
        fx.cancelOrderAction.mockResolvedValue({ success: true, status: 'cancelled_by_buyer', auctionAction: 'reopened' });
        renderPanel({ isBuyer: true, isPermanent: false });
        clickButton(/^Cancel order$/);
        expect(container.textContent).toContain('The listing will reopen for 24 hours.');
        clickButton(/^Yes, cancel order$/);
        await flush();
        expect(container.textContent).toContain('The listing was reopened for 24 hours.');
    });

    it('keeps the same reason choices for buyer and seller', () => {
        renderPanel({ isBuyer: false });
        const sellerOptions = Array.from(container.querySelectorAll('select option')).map((o) => o.textContent);
        expect(sellerOptions).toEqual(['Item no longer available', 'Buyer unreachable', 'Mutual agreement', 'Other']);
        act(() => root.unmount());
        container.remove();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        renderPanel({ isBuyer: true });
        const buyerOptions = Array.from(container.querySelectorAll('select option')).map((o) => o.textContent);
        expect(buyerOptions).toEqual(['Changed my mind', 'Mutual agreement', 'Duplicate order', 'Other']);
    });

    it('surfaces action errors without a success message', async () => {
        fx.cancelOrderAction.mockResolvedValue({ success: false, error: 'Cancellation is only allowed before fulfillment starts.' });
        renderPanel();
        clickButton(/^Cancel order$/);
        clickButton(/^Yes, cancel order$/);
        await flush();
        expect(container.textContent).toContain('Cancellation is only allowed before fulfillment starts.');
        expect(container.textContent).not.toContain('Order cancelled successfully.');
    });
});

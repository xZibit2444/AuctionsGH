// @vitest-environment jsdom
/**
 * Controlled-fixture render tests for ReportListingButton.
 * Auth and the support action are mocked; fixtures drive the flow.
 * No live reports are submitted. Run with: npx vitest run
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
    submitted: [] as Array<Record<string, unknown>>,
    user: null as { id: string; email: string } | null,
    profile: null as { full_name: string | null; username: string } | null,
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: h.user, profile: h.profile }),
}));
vi.mock('@/app/actions/support', () => ({
    submitSupportRequest: vi.fn(async (input: Record<string, unknown>) => {
        h.submitted.push(input);
        return { success: true };
    }),
}));

import ReportListingButton from '@/components/auction/ReportListingButton';

let root: Root | undefined;
let container: HTMLDivElement;

async function render() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(<ReportListingButton auctionId="a1" auctionTitle="iPhone 15 Pro" />);
    });
}

async function click(el: Element) {
    await act(async () => {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
}

describe('ReportListingButton', () => {
    beforeEach(() => {
        h.submitted = [];
        h.user = { id: 'u1', email: 'buyer@example.com' };
        h.profile = { full_name: 'Ama Buyer', username: 'ama' };
    });

    afterEach(async () => {
        if (root) {
            const r = root;
            root = undefined;
            await act(async () => { r.unmount(); });
        }
        document.body.innerHTML = '';
    });

    it('logged-in user reports with prefilled identity and listing context', async () => {
        await render();
        const btn = container!.querySelector('button[aria-label="Report listing"]')!;
        await click(btn);
        expect(container!.textContent).toContain('Report this listing');

        const form = container!.querySelector('form')!;
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await act(async () => { await Promise.resolve(); });

        expect(h.submitted).toHaveLength(1);
        const req = h.submitted[0];
        expect(req.topic).toBe('Report a user or listing');
        expect(req.name).toBe('Ama Buyer');
        expect(req.email).toBe('buyer@example.com');
        const msg = String(req.message);
        expect(msg).toContain('Listing: iPhone 15 Pro');
        expect(msg).toContain('/auctions/a1');
        expect(msg).toContain('Reason: Scam or fraud');
        expect(container!.textContent).toContain('Report sent');
    });

    it('logged-out user must supply name and email', async () => {
        h.user = null;
        h.profile = null;
        await render();
        await click(container!.querySelector('button[aria-label="Report listing"]')!);
        const inputs = [...container!.querySelectorAll('form input')];
        expect(inputs.some((i) => (i as HTMLInputElement).type === 'email')).toBe(true);
    });
});

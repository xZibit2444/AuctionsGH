// @vitest-environment jsdom
/**
 * Controlled-fixture render tests for the WhatsApp opt-in checkbox in
 * CreateAuctionForm. Auth, supabase, uploads and navigation are mocked;
 * fixtures drive new-seller vs existing-seller state. No live data.
 * Run with: npx vitest run src/__tests__/createWhatsappOptIn.test.tsx
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const h = vi.hoisted(() => ({
    listingCount: 0,
    profile: {
        id: 'user-1',
        phone_number: '+233 24 000 0000',
        whatsapp_enabled: false,
    } as Record<string, unknown>,
    user: { id: 'user-1' } as Record<string, unknown> | null,
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: () => {
                const q: Record<string, unknown> = {};
                q.eq = () => q;
                q.limit = () => q;
                q.then = (resolve: (v: { count: number }) => unknown) =>
                    Promise.resolve({ count: h.listingCount }).then(resolve);
                return q;
            },
        }),
    }),
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: h.user, profile: h.profile, loading: false }),
}));

vi.mock('@/hooks/useImageUpload', () => ({
    useImageUpload: () => ({ uploadImage: vi.fn(), uploading: false }),
}));
vi.mock('@/hooks/useVideoUpload', () => ({
    useVideoUpload: () => ({ uploadVideo: vi.fn(), uploading: false }),
}));
vi.mock('@/app/actions/listingVideo', () => ({
    finalizeListingVideo: vi.fn(async () => ({ success: true })),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

import CreateAuctionForm from '@/components/auction/CreateAuctionForm';

let container: HTMLDivElement;
let root: Root;

async function renderAndGoToStep3() {
    await act(async () => {
        root.render(<CreateAuctionForm />);
    });
    // wait for the listings-count effect to resolve
    await act(async () => {
        await Promise.resolve();
    });
    const next1 = [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Next: Add Photos')
    ) as HTMLButtonElement;
    await act(async () => {
        next1.click();
    });
    const next2 = [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Next: Set Price')
    ) as HTMLButtonElement;
    await act(async () => {
        next2.click();
    });
}

function whatsappCheckbox(): HTMLInputElement | null {
    return [...container.querySelectorAll('input[type="checkbox"]')].find((c) =>
        c.closest('label')?.textContent?.includes('WhatsApp chat button')
    ) ?? null;
}

describe('CreateAuctionForm WhatsApp opt-in default', () => {
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });
    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('defaults ON for a first-time seller with a saved phone, with disclosure', async () => {
        h.user = { id: 'user-1' };
        h.profile = { id: 'user-1', phone_number: '+233 24 000 0000', whatsapp_enabled: false };
        h.listingCount = 0;
        await renderAndGoToStep3();
        const cb = whatsappCheckbox();
        expect(cb).not.toBeNull();
        expect(cb!.checked).toBe(true);
        const label = cb!.closest('label')!.textContent!;
        expect(label).toContain('+233 24 000 0000');
        expect(label).toContain('visible to buyers');
    });

    it('defaults OFF for a first-time seller without a saved phone', async () => {
        h.user = { id: 'user-1' };
        h.profile = { id: 'user-1', phone_number: null, whatsapp_enabled: false };
        h.listingCount = 0;
        await renderAndGoToStep3();
        // checkbox only renders when a phone is saved
        expect(whatsappCheckbox()).toBeNull();
    });

    it('reflects the saved setting for an existing seller (opted in)', async () => {
        h.user = { id: 'user-1' };
        h.profile = { id: 'user-1', phone_number: '+233 24 000 0000', whatsapp_enabled: true };
        h.listingCount = 5;
        await renderAndGoToStep3();
        expect(whatsappCheckbox()!.checked).toBe(true);
    });

    it('defaults OFF for an existing seller who never opted in', async () => {
        h.user = { id: 'user-1' };
        h.profile = { id: 'user-1', phone_number: '+233 24 000 0000', whatsapp_enabled: false };
        h.listingCount = 5;
        await renderAndGoToStep3();
        expect(whatsappCheckbox()!.checked).toBe(false);
    });
});

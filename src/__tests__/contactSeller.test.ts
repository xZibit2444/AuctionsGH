import { describe, it, expect, vi } from 'vitest';
import { trackContactSeller } from '@/lib/analytics';

const gtag = vi.hoisted(() => vi.fn());
vi.stubGlobal('window', { gtag });

describe('trackContactSeller (browse-to-contact)', () => {
    it('fires contact_seller with listing, category and whatsapp method', () => {
        trackContactSeller('listing-1', 'Phones & Tablets', 'whatsapp');
        expect(gtag).toHaveBeenCalledWith('event', 'contact_seller', {
            listing_id: 'listing-1',
            listing_category: 'Phones & Tablets',
            contact_method: 'whatsapp',
            measurement_version: 'contact_v1',
        });
    });

    it('distinguishes in-house chat starts from whatsapp taps', () => {
        trackContactSeller('listing-2', 'Vehicles', 'chat');
        expect(gtag).toHaveBeenCalledWith('event', 'contact_seller', expect.objectContaining({ contact_method: 'chat' }));
        expect(gtag).not.toHaveBeenCalledWith('event', 'contact_seller', expect.objectContaining({ contact_method: 'send_message' }));
    });

    it('never reuses order or sale event names for contact', () => {
        trackContactSeller('listing-3', 'Laptops', 'chat');
        const names = gtag.mock.calls.map((call) => call[1]);
        expect(names).not.toContain('purchase');
        expect(names).not.toContain('order');
        expect(names).not.toContain('sale');
        expect(names.every((name) => name === 'contact_seller')).toBe(true);
    });
});

import { describe, expect, it } from 'vitest';
import { listingDescription, listingStructuredData, serializeJsonLd } from '@/lib/seo';
import type { AuctionFull } from '@/types/auction';

const listing = {
    id: 'listing-1', title: 'Apple iPhone 18 Pro 256GB', description: 'eSIM Locked',
    current_price: 11200, status: 'active', condition: 'unspecified',
    ends_at: '2099-12-31T23:59:59Z', allow_buy_now: true,
    auction_images: [{ url: 'https://example.com/second.jpg', position: 1 }, { url: 'https://example.com/first.jpg', position: 0 }],
} as AuctionFull;

describe('listing SEO accuracy', () => {
    it('describes the listing as an item page with ordered images and no purchase offer', () => {
        const data = listingStructuredData(listing, 'https://auctionsgh.com');
        expect(data['@type']).toBe('ItemPage');
        expect(data).not.toHaveProperty('offers');
        expect(data.image?.[0]).toBe('https://example.com/first.jpg');
        expect(data).not.toHaveProperty('itemCondition');
        expect(data).not.toHaveProperty('aggregateRating');
        expect(data).not.toHaveProperty('brand'); // category column is not reliably a manufacturer
    });
    it('never claims a purchase offer, even for sold, fixed-price or new-condition listings', () => {
        for (const variant of [
            { ...listing, status: 'sold', condition: 'brand_new' },
            { ...listing, allow_buy_now: false },
            { ...listing, ends_at: '2026-11-05T00:00:00Z' },
            { ...listing, status: 'cancelled' },
        ] as AuctionFull[]) {
            const data = listingStructuredData(variant, 'https://auctionsgh.com');
            expect(data['@type']).toBe('ItemPage');
            expect(data).not.toHaveProperty('offers');
            expect(data).not.toHaveProperty('itemCondition');
        }
    });
    it('escapes seller-supplied script closing tags without corrupting JSON', () => {
        const payload = { description: '</script><script>alert(1)</script>' };
        const serialized = serializeJsonLd(payload);
        expect(serialized).not.toContain('<');
        expect(JSON.parse(serialized)).toEqual(payload);
    });
    it('makes concise descriptions without inventing unit condition or payment protection', () => {
        expect(listingDescription({ ...listing, description: null, listing_city: 'Accra' })).toContain('for sale in Accra');
        expect(listingDescription({ ...listing, description: 'word '.repeat(100) }).length).toBeLessThanOrEqual(180);
    });
});

import { getListingType } from '@/lib/listings';
import type { AuctionFull } from '@/types/auction';

export function serializeJsonLd(value: unknown) {
    // Seller content must never be able to close the JSON-LD script tag.
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function listingDescription(auction: Pick<AuctionFull, 'title' | 'description' | 'listing_city'>) {
    return (auction.description?.trim() || `${auction.title} for sale${auction.listing_city ? ` in ${auction.listing_city}` : ' in Ghana'}. View the listing and contact the seller on AuctionsGH.`)
        .replace(/\s+/g, ' ').slice(0, 180);
}

export function listingStructuredData(auction: AuctionFull, siteUrl: string) {
    const url = `${siteUrl}/auctions/${auction.id}`;
    const images = [...(auction.auction_images ?? [])].sort((a, b) => a.position - b.position)
        .map((image) => image.url).filter((image) => /^https:\/\//.test(image));
    const conditions: Record<string, string> = {
        new: 'NewCondition', brand_new: 'NewCondition',
        like_new: 'UsedCondition', good: 'UsedCondition', fair: 'UsedCondition', poor: 'UsedCondition',
    };
    const condition = conditions[auction.condition];
    // A changing auction bid is not a fixed sale price. Enquiry-only listings
    // must not claim a purchasable, in-stock offer either.
    const hasOffer = getListingType(auction) === 'permanent' && auction.allow_buy_now !== false
        && ['active', 'sold'].includes(auction.status) && Number(auction.current_price) > 0;
    return {
        '@context': 'https://schema.org', '@type': 'Product',
        '@id': `${url}#product`, url, name: auction.title,
        description: listingDescription(auction),
        ...(images.length ? { image: images } : {}),
        ...(condition ? { itemCondition: `https://schema.org/${condition}` } : {}),
        ...(hasOffer ? { offers: {
            '@type': 'Offer', url, priceCurrency: 'GHS', price: Number(auction.current_price),
            availability: `https://schema.org/${auction.status === 'active' ? 'InStock' : 'SoldOut'}`,
            ...(condition ? { itemCondition: `https://schema.org/${condition}` } : {}),
        } } : {}),
    };
}

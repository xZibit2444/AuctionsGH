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
    // Do not advertise Product rich-result markup when there is no genuine
    // fixed-price offer. Auction bids and enquiry prices are not sale offers.
    // Keep those public listings described as ordinary, indexable item pages.
    return {
        '@context': 'https://schema.org', '@type': hasOffer ? 'Product' : 'ItemPage',
        '@id': `${url}#${hasOffer ? 'product' : 'itempage'}`, url, name: auction.title,
        description: listingDescription(auction),
        ...(images.length ? { image: images } : {}),
        ...(hasOffer && condition ? { itemCondition: `https://schema.org/${condition}` } : {}),
        ...(hasOffer ? { offers: {
            '@type': 'Offer', url, priceCurrency: 'GHS', price: Number(auction.current_price),
            availability: `https://schema.org/${auction.status === 'active' ? 'InStock' : 'SoldOut'}`,
            ...(condition ? { itemCondition: `https://schema.org/${condition}` } : {}),
        } } : {}),
    };
}

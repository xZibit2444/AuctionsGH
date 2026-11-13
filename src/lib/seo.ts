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
    // Buy now and checkout are retired: no listing is directly purchasable on
    // the platform, so none may claim Product/Offer rich-result markup.
    // Auction bids and enquiry prices are not sale offers. Keep every public
    // listing described as an ordinary, indexable item page.
    return {
        '@context': 'https://schema.org', '@type': 'ItemPage',
        '@id': `${url}#itempage`, url, name: auction.title,
        description: listingDescription(auction),
        ...(images.length ? { image: images } : {}),
    };
}

import type { AuctionStatus } from '@/types/database';

export type ListingType = 'auction' | 'permanent';

const PERMANENT_LISTING_YEAR_THRESHOLD = 2090;

export function isPermanentListing(endsAt?: string | null) {
    if (!endsAt) return false;

    const year = new Date(endsAt).getUTCFullYear();
    return Number.isFinite(year) && year >= PERMANENT_LISTING_YEAR_THRESHOLD;
}

export function getListingType(listing: {
    ends_at?: string | null;
    bid_count?: number | null;
    status?: AuctionStatus | null;
}): ListingType {
    if (isPermanentListing(listing.ends_at)) {
        return 'permanent';
    }

    // Accepted offers on permanent listings currently overwrite ends_at.
    if (listing.status === 'sold' && (listing.bid_count ?? 0) === 0) {
        return 'permanent';
    }

    return 'auction';
}

export function getListingTypeLabel(type: ListingType) {
    return type === 'permanent' ? 'Permanent Listing' : 'Auction';
}

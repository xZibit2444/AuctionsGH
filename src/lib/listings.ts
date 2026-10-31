import type { AuctionStatus } from '@/types/database';

export type ListingType = 'auction' | 'permanent';

const PERMANENT_LISTING_YEAR_THRESHOLD = 2090;

/** Far-future ends_at used for permanent ('live until sold') listings. */
export const PERMANENT_LISTING_ENDS_AT = '2099-12-31T23:59:59.000Z';

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

    // Buy-now purchases (and offer acceptances before 2026-10-31) on permanent
    // listings overwrite ends_at with the sale time, so detect those too.
    if (listing.status === 'sold' && (listing.bid_count ?? 0) === 0) {
        return 'permanent';
    }

    return 'auction';
}

export function getListingTypeLabel(type: ListingType) {
    return type === 'permanent' ? 'Permanent Listing' : 'Auction';
}

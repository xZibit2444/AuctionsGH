import { createClient } from '@/lib/supabase/server';
import { getListingType, type ListingType } from '@/lib/listings';
import { shuffled } from '@/lib/rotation';
import type { Auction } from '@/types/auction';

/** Public card fields only; no orders, offers, private notes or account data. */
export async function getPublicBrowse(listingType?: ListingType, home = false): Promise<Auction[] | undefined> {
    try {
        const supabase = await createClient();
        const rows: Auction[] = [];
        for (let offset = 0; ; offset += 1000) {
            const query = supabase.from('auctions').select(`id, title, brand, model, condition,
                current_price, status, bid_count, ends_at, created_at, updated_at, seller_id,
                storage_gb, listing_city, meetup_area, delivery_available, is_pinned,
                profiles!auctions_seller_id_fkey(username, full_name, avatar_url),
                auction_images(url, position), listing_videos(id)`)
                .in('status', home ? ['active'] : ['active', 'sold'])
                .order('ends_at', { ascending: true }).order('id', { ascending: true });
            const { data, error } = home ? await query.limit(30) : await query.range(offset, offset + 999);
            if (error) return undefined; // Existing client fetch/retry remains available.
            rows.push(...(data as unknown as Auction[]));
            if (home || data.length < 1000) break;
        }
        return shuffled(rows.filter(row => (!listingType || getListingType(row) === listingType)
            && (row.status !== 'sold' || Date.now() - new Date(row.updated_at).getTime() <= 48 * 60 * 60 * 1000)));
    } catch {
        return undefined;
    }
}

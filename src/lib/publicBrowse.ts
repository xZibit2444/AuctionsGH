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
                storage_gb, listing_city, meetup_area, delivery_available, is_pinned, price_on_request,
                profiles!auctions_seller_id_fkey(username, full_name, avatar_url, whatsapp_enabled),
                auction_images(url, position), listing_videos(id)`)
                .in('status', home ? ['active'] : ['active', 'sold'])
                .order('is_pinned', { ascending: false }).order('ends_at', { ascending: true }).order('id', { ascending: true });
            const { data, error } = home ? await query.limit(30) : await query.range(offset, offset + 999);
            if (error) return undefined; // Existing client fetch/retry remains available.
            rows.push(...(data as unknown as Auction[]));
            if (home || data.length < 1000) break;
        }
        // Pinned cards offer a direct WhatsApp enquiry CTA: fetch the seller's
        // opted-in phone via the same gated RPC the listing page uses (the
        // phone column itself is not publicly selectable).
        await Promise.all(rows.map(async (row) => {
            const p = (row as unknown as { profiles?: { whatsapp_enabled?: boolean | null; phone_number?: string | null } | null }).profiles;
            if (row.is_pinned && p?.whatsapp_enabled) {
                const { data: phone } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, string>) => Promise<{ data: string | null }> })
                    .rpc('get_profile_phone', { profile_id: row.seller_id });
                p.phone_number = phone ?? null;
            }
        }));
        return shuffled(rows.filter(row => (!listingType || getListingType(row) === listingType)
            && (row.status !== 'sold' || Date.now() - new Date(row.updated_at).getTime() <= 48 * 60 * 60 * 1000)));
    } catch {
        return undefined;
    }
}

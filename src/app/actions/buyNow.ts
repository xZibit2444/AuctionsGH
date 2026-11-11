'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isPermanentListing } from '@/lib/listings';
import { userMayWrite, PHONE_REQUIRED_MESSAGE } from '@/lib/phoneRequirement';

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Start a fixed-price purchase at the listed price. No seller confirmation.
 *
 * Listings are permanent: only the seller takes one down (pause, mark sold,
 * delete). Clicking Buy now does NOT claim or reserve the listing - buyers
 * can click and never pay, and an automatic takedown would hide the item from
 * every other buyer for nothing. The buyer proceeds to checkout; the order is
 * created there at the database price, and the first confirmed order wins the
 * single open-deal slot (enforced in createOrderAction). Open offers from
 * other buyers are left untouched for the seller to manage.
 */
export async function buyNowAction(
    auctionId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await userMayWrite(user.id))) return { success: false, error: PHONE_REQUIRED_MESSAGE };

    const { data: listing } = await supabaseAdmin
        .from('auctions')
        .select('id, title, seller_id, status, ends_at, current_price, allow_buy_now')
        .eq('id', auctionId)
        .maybeSingle();

    if (!listing) return { success: false, error: 'Listing not found' };
    if (!isPermanentListing(listing.ends_at)) return { success: false, error: 'This item is an auction. Place a bid instead.' };
    if (listing.status !== 'active') return { success: false, error: 'This item is no longer available' };
    if ((listing as { allow_buy_now?: boolean }).allow_buy_now === false) return { success: false, error: 'Buy now is not available for this item. Make an offer instead.' };
    if (listing.seller_id === user.id) return { success: false, error: 'You cannot buy your own listing' };

    const price = Number(listing.current_price);
    if (!price || price <= 0) return { success: false, error: 'This listing has no price' };

    return { success: true };
}

'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isPermanentListing } from '@/lib/listings';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import { sendAuctionSoldEmail, sendAuctionWonEmail } from '@/lib/email/sender';

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function displayName(p: { full_name?: string | null; username?: string | null } | null, fallback: string) {
    return p?.full_name?.trim() || p?.username?.trim() || fallback;
}

/**
 * Buy a fixed-price listing at its listed price. No seller confirmation.
 * The price is read from the database, never from the client. The listing is
 * claimed with one conditional update (status must still be 'active'), so only
 * one buyer can win. The buyer then completes the normal pay-on-meetup
 * checkout at /checkout/[id] (fixed-price listings have no checkout deadline).
 */
export async function buyNowAction(
    auctionId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: listing } = await supabaseAdmin
        .from('auctions')
        .select('id, title, seller_id, status, ends_at, current_price')
        .eq('id', auctionId)
        .maybeSingle();

    if (!listing) return { success: false, error: 'Listing not found' };
    if (!isPermanentListing(listing.ends_at)) return { success: false, error: 'This item is an auction. Place a bid instead.' };
    if (listing.status !== 'active') return { success: false, error: 'This item is no longer available' };
    if (listing.seller_id === user.id) return { success: false, error: 'You cannot buy your own listing' };

    const price = Number(listing.current_price);
    if (!price || price <= 0) return { success: false, error: 'This listing has no price' };

    const now = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('auctions')
        .update({ status: 'sold', winner_id: user.id, current_price: price, ends_at: now, updated_at: now })
        .eq('id', auctionId)
        .eq('status', 'active')
        .select('id');

    if (claimErr) return { success: false, error: 'Could not complete the purchase. Please try again.' };
    if (!claimed || claimed.length === 0) return { success: false, error: 'Someone else just bought this item' };

    await supabaseAdmin
        .from('auction_offers')
        .update({ status: 'declined', updated_at: now })
        .eq('auction_id', auctionId)
        .eq('status', 'pending');

    const amountText = `GHS ${price.toLocaleString()}`;
    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: user.id,
        type: 'auction_won',
        title: 'Item Reserved For You',
        body: `You bought "${listing.title}" at ${amountText}. Confirm your order, then agree with the seller how to pay and collect.`,
        auction_id: auctionId,
    });
    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: listing.seller_id,
        type: 'new_offer',
        title: 'Item Bought At Listed Price',
        body: `A buyer bought "${listing.title}" at ${amountText}. They will confirm the order and contact you to arrange payment and collection.`,
        auction_id: auctionId,
    });

    try {
        const [{ data: sp }, { data: bp }, sAuth, bAuth] = await Promise.all([
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', listing.seller_id).maybeSingle(),
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle(),
            supabaseAdmin.auth.admin.getUserById(listing.seller_id),
            supabaseAdmin.auth.admin.getUserById(user.id),
        ]);
        const sellerName = displayName(sp, 'Seller');
        const buyerName = displayName(bp, 'Buyer');
        if (bAuth.data.user?.email) {
            await sendAuctionWonEmail(bAuth.data.user.email, buyerName, listing.title, price, auctionId, true);
        }
        if (sAuth.data.user?.email) {
            await sendAuctionSoldEmail(sAuth.data.user.email, sellerName, listing.title, price, buyerName, true);
        }
    } catch (e) {
        console.error('Buy-now emails failed:', e);
    }

    return { success: true };
}

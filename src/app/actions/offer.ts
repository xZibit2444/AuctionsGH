'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Buyer sends an offer to the seller of an active auction. */
export async function makeOfferAction(
    auctionId: string,
    amount: number
): Promise<{ success: boolean; error?: string; offerId?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!amount || amount <= 0) return { success: false, error: 'Invalid amount' };

    // Verify auction is active and get seller info
    const { data: auction, error: auctionErr } = await supabaseAdmin
        .from('auctions')
        .select('id, title, seller_id, status')
        .eq('id', auctionId)
        .single();

    if (auctionErr || !auction) return { success: false, error: 'Auction not found' };
    if (auction.status !== 'active') return { success: false, error: 'Auction is no longer active' };
    if (auction.seller_id === user.id) return { success: false, error: 'You cannot make an offer on your own auction' };

    // Cancel any existing pending offer from this buyer (so the unique index doesn't block the new one)
    await supabaseAdmin
        .from('auction_offers')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('auction_id', auctionId)
        .eq('buyer_id', user.id)
        .eq('status', 'pending');

    // Insert the new offer
    const { data: offer, error: insertErr } = await supabaseAdmin
        .from('auction_offers')
        .insert({
            auction_id: auctionId,
            buyer_id: user.id,
            seller_id: auction.seller_id,
            amount,
        })
        .select('id')
        .single();

    if (insertErr || !offer) return { success: false, error: 'Failed to send offer. Please try again.' };

    // Notify the seller
    const { data: buyerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

    const buyerLabel = (buyerProfile as any)?.full_name || (buyerProfile as any)?.username || 'A buyer';

    await supabaseAdmin.from('notifications').insert({
        user_id: auction.seller_id,
        type: 'new_offer',
        title: 'New Offer on Your Listing',
        body: `${buyerLabel} is asking: "Will you accept GHS ${Number(amount).toLocaleString()} for ${auction.title}?"`,
        auction_id: auctionId,
    });

    return { success: true, offerId: offer.id };
}

/** Seller responds to a pending offer with 'accepted' or 'declined'. */
export async function respondToOfferAction(
    offerId: string,
    response: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Fetch the offer
    const { data: offer, error: fetchErr } = await supabaseAdmin
        .from('auction_offers')
        .select('id, auction_id, buyer_id, seller_id, amount, status')
        .eq('id', offerId)
        .single();

    if (fetchErr || !offer) return { success: false, error: 'Offer not found' };
    if (offer.seller_id !== user.id) return { success: false, error: 'Unauthorized' };
    if (offer.status !== 'pending') return { success: false, error: 'This offer is no longer pending' };

    // Mark this offer with the response
    await supabaseAdmin
        .from('auction_offers')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', offerId);

    if (response === 'accepted') {
        // Fetch auction for title
        const { data: auction } = await supabaseAdmin
            .from('auctions')
            .select('title, status')
            .eq('id', offer.auction_id)
            .single();

        if (!auction || auction.status !== 'active') {
            return { success: false, error: 'Auction is no longer active — cannot accept offer' };
        }

        // Mark auction as sold with the offer price;
        // ends_at=NOW() starts the buyer's 30-minute checkout window
        const now = new Date().toISOString();
        const { error: updateErr } = await supabaseAdmin
            .from('auctions')
            .update({
                status: 'sold',
                winner_id: offer.buyer_id,
                current_price: offer.amount,
                ends_at: now,
                updated_at: now,
            })
            .eq('id', offer.auction_id)
            .eq('status', 'active'); // guard: only update if still active

        if (updateErr) return { success: false, error: 'Failed to finalise auction' };

        // Decline all other pending offers for this auction
        await supabaseAdmin
            .from('auction_offers')
            .update({ status: 'declined', updated_at: now })
            .eq('auction_id', offer.auction_id)
            .eq('status', 'pending')
            .neq('id', offerId);

        // Notify buyer — they can proceed to checkout
        await supabaseAdmin.from('notifications').insert({
            user_id: offer.buyer_id,
            type: 'auction_won',
            title: 'Your Offer Was Accepted!',
            body: `The seller accepted your offer of GHS ${Number(offer.amount).toLocaleString()} for "${auction.title}". You have 30 minutes to complete your order.`,
            auction_id: offer.auction_id,
        });

        // Notify seller of confirmation
        await supabaseAdmin.from('notifications').insert({
            user_id: user.id,
            type: 'new_offer',
            title: 'Offer Accepted — Awaiting Buyer',
            body: `You accepted GHS ${Number(offer.amount).toLocaleString()} for "${auction.title}". The listing stays active until the order is completed.`,
            auction_id: offer.auction_id,
        });
    } else {
        // Declined — notify buyer
        const { data: auction } = await supabaseAdmin
            .from('auctions')
            .select('title')
            .eq('id', offer.auction_id)
            .single();

        await supabaseAdmin.from('notifications').insert({
            user_id: offer.buyer_id,
            type: 'system',
            title: 'Offer Declined',
            body: `The seller declined your offer of GHS ${Number(offer.amount).toLocaleString()} for "${auction?.title ?? 'this item'}".`,
            auction_id: offer.auction_id,
        });
    }

    return { success: true };
}

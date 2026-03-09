'use server';

import { createClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';

// We must use the service role key to bypass RLS since the client might not have permissions to arbitrarily finalize auctions.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function finalizeAuctionAction(auctionId: string) {
    if (!auctionId) return { success: false, error: 'Missing auction ID' };

    try {
        // Fetch the auction with its top bid
        const { data: auction, error: fetchError } = await supabaseAdmin
            .from('auctions')
            .select(`
                id,
                title,
                seller_id,
                current_price,
                status,
                ends_at,
                bids (
                    bidder_id,
                    amount
                )
            `)
            .eq('id', auctionId)
            .single();

        if (fetchError || !auction) {
            console.error('Finalize error fetching auction:', fetchError);
            return { success: false, error: 'Auction not found' };
        }

        // Only process if it's still active and actually ended
        if (auction.status !== 'active') {
            return { success: false, error: 'Auction already finalized' };
        }

        if (new Date(auction.ends_at).getTime() > Date.now()) {
            return { success: false, error: 'Auction has not ended yet' };
        }

        const topBid = auction.bids?.sort((a: any, b: any) => b.amount - a.amount)[0];

        if (topBid) {
            // Found a winner
            const { error: updateError } = await supabaseAdmin
                .from('auctions')
                .update({
                    status: 'sold',
                    winner_id: topBid.bidder_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', auctionId);

            if (updateError) throw updateError;

            // Send notification to winner
            await insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: topBid.bidder_id,
                type: 'auction_won',
                title: 'You Won the Auction!',
                body: `Click here to proceed to checkout and arrange payment/delivery for "${auction.title}".`,
                auction_id: auctionId
            });

            // Send notification to seller
            await insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: auction.seller_id,
                type: 'auction_ended',
                title: 'Your auction has ended',
                body: `"${auction.title}" sold for ${auction.current_price} GHS`,
                auction_id: auctionId
            });

        } else {
            // No bids
            const { error: updateError } = await supabaseAdmin
                .from('auctions')
                .update({
                    status: 'ended',
                    updated_at: new Date().toISOString()
                })
                .eq('id', auctionId);

            if (updateError) throw updateError;

            // Notify seller it ended without bids
            await insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: auction.seller_id,
                type: 'auction_ended',
                title: 'Your auction ended with no bids',
                body: `"${auction.title}" received no bids`,
                auction_id: auctionId
            });
        }

        return { success: true };

    } catch (err: any) {
        console.error('Finalize action failed:', err);
        return { success: false, error: err.message };
    }
}

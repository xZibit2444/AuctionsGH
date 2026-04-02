import { createClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import {
    sendAuctionEndedNoBidsEmail,
    sendAuctionSoldEmail,
    sendAuctionWonEmail,
} from '@/lib/email/sender';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

function getDisplayName(profile: { full_name?: string | null; username?: string | null } | null, fallback: string) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

export async function finalizeAuction(auctionId: string) {
    if (!auctionId) return { success: false, error: 'Missing auction ID' };

    try {
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

        if (auction.status !== 'active') {
            return { success: false, error: 'Auction already finalized' };
        }

        if (new Date(auction.ends_at).getTime() > Date.now()) {
            return { success: false, error: 'Auction has not ended yet' };
        }

        const topBid = auction.bids?.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount)[0];

        if (topBid) {
            const { error: updateError } = await supabaseAdmin
                .from('auctions')
                .update({
                    status: 'sold',
                    winner_id: topBid.bidder_id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', auctionId);

            if (updateError) throw updateError;

            await insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: topBid.bidder_id,
                type: 'auction_won',
                title: 'You Won the Auction!',
                body: `Click here to proceed to checkout and arrange payment/delivery for "${auction.title}".`,
                auction_id: auctionId,
            });

            await insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: auction.seller_id,
                type: 'auction_ended',
                title: 'Your auction has ended',
                body: `"${auction.title}" sold for ${auction.current_price} GHS`,
                auction_id: auctionId,
            });

            const [{ data: sellerProfile }, { data: buyerProfile }, sellerAuthResult, buyerAuthResult] = await Promise.all([
                supabaseAdmin.from('profiles').select('full_name, username').eq('id', auction.seller_id).maybeSingle(),
                supabaseAdmin.from('profiles').select('full_name, username').eq('id', topBid.bidder_id).maybeSingle(),
                supabaseAdmin.auth.admin.getUserById(auction.seller_id),
                supabaseAdmin.auth.admin.getUserById(topBid.bidder_id),
            ]);

            const sellerName = getDisplayName(
                sellerProfile as { full_name?: string | null; username?: string | null } | null,
                'Seller'
            );
            const buyerName = getDisplayName(
                buyerProfile as { full_name?: string | null; username?: string | null } | null,
                'Buyer'
            );

            if (buyerAuthResult.data.user?.email) {
                const buyerEmailResult = await sendAuctionWonEmail(
                    buyerAuthResult.data.user.email,
                    buyerName,
                    auction.title,
                    Number(topBid.amount),
                    auctionId
                );

                if (!buyerEmailResult.success) {
                    console.error('Failed to send auction won email:', buyerEmailResult.error);
                }
            }

            if (sellerAuthResult.data.user?.email) {
                const sellerEmailResult = await sendAuctionSoldEmail(
                    sellerAuthResult.data.user.email,
                    sellerName,
                    auction.title,
                    Number(topBid.amount),
                    buyerName
                );

                if (!sellerEmailResult.success) {
                    console.error('Failed to send auction sold email:', sellerEmailResult.error);
                }
            }
        } else {
            const { error: updateError } = await supabaseAdmin
                .from('auctions')
                .update({
                    status: 'ended',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', auctionId);

            if (updateError) throw updateError;

            await insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: auction.seller_id,
                type: 'auction_ended',
                title: 'Your auction ended with no bids',
                body: `"${auction.title}" received no bids`,
                auction_id: auctionId,
            });

            const [{ data: sellerProfile }, sellerAuthResult] = await Promise.all([
                supabaseAdmin.from('profiles').select('full_name, username').eq('id', auction.seller_id).maybeSingle(),
                supabaseAdmin.auth.admin.getUserById(auction.seller_id),
            ]);

            if (sellerAuthResult.data.user?.email) {
                const sellerName = getDisplayName(
                    sellerProfile as { full_name?: string | null; username?: string | null } | null,
                    'Seller'
                );
                const noBidEmailResult = await sendAuctionEndedNoBidsEmail(
                    sellerAuthResult.data.user.email,
                    sellerName,
                    auction.title
                );

                if (!noBidEmailResult.success) {
                    console.error('Failed to send no-bids email:', noBidEmailResult.error);
                }
            }
        }

        return { success: true };
    } catch (err: unknown) {
        console.error('Finalize action failed:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to finalize auction',
        };
    }
}

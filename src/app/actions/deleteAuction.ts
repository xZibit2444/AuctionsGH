'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function deleteAuctionAction(
    auctionId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Verify ownership and deletability
    const { data: auction, error: fetchError } = await supabaseAdmin
        .from('auctions')
        .select('id, seller_id, status, bid_count')
        .eq('id', auctionId)
        .single();

    if (fetchError || !auction) return { success: false, error: 'Auction not found' };
    if (auction.seller_id !== user.id) return { success: false, error: 'Not your auction' };
    if (auction.status === 'sold') return { success: false, error: 'This auction has an active deal. It cannot be deleted until the order is completed.' };
    if ((auction.bid_count ?? 0) > 0) return { success: false, error: 'Cannot delete an auction that has bids' };

    // Block deletion if there is an accepted offer and the deal has not finished
    const { data: acceptedOffer } = await supabaseAdmin
        .from('auction_offers')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

    if (acceptedOffer) {
        // Check whether the order was fully completed
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('status')
            .eq('auction_id', auctionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const isDone = order && (order.status === 'delivered' || order.status === 'completed');
        if (!isDone) {
            return { success: false, error: 'There is an active deal on this listing. It cannot be deleted until the order is completed.' };
        }
    }

    const { error } = await supabaseAdmin
        .from('auctions')
        .delete()
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

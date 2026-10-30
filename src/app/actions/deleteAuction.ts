'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AUCTION_VIDEOS_BUCKET } from '@/lib/constants';
import type { Profile } from '@/types/profile';
import type { Auction } from '@/types/auction';

const supabaseAdmin = createAdminClient();

// Listing videos live in storage; unlike images (legacy behavior), deleting a listing
// also removes its video file so it is not orphaned.
async function removeListingVideoFiles(auctionId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: videos } = await (supabaseAdmin.from('listing_videos') as any)
        .select('storage_path')
        .eq('auction_id', auctionId);
    const paths = ((videos ?? []) as { storage_path: string }[])
        .map((v) => v.storage_path)
        .filter(Boolean);
    if (paths.length > 0) {
        const { error } = await supabaseAdmin.storage.from(AUCTION_VIDEOS_BUCKET).remove(paths);
        if (error) console.error('Failed to remove listing video files:', error.message);
    }
}
type OrderStatusRow = { status: string };

export async function deleteAuctionAction(
    auctionId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle() as {
            data: Pick<Profile, 'is_super_admin'> | null;
            error: unknown;
        };

    const isSuperAdmin = callerProfile?.is_super_admin === true;

    // Verify ownership and deletability
    const { data: auction, error: fetchError } = await supabaseAdmin
        .from('auctions')
        .select('id, seller_id, status, bid_count')
        .eq('id', auctionId)
        .single() as {
            data: Pick<Auction, 'id' | 'seller_id' | 'status' | 'bid_count'> | null;
            error: unknown;
        };

    if (fetchError || !auction) return { success: false, error: 'Auction not found' };
    const isOwner = auction.seller_id === user.id;

    if (!isOwner && !isSuperAdmin) {
        return { success: false, error: 'Not allowed to delete this auction' };
    }

    if (isSuperAdmin) {
        await removeListingVideoFiles(auctionId);
        const { error } = await supabaseAdmin
            .from('auctions')
            .delete()
            .eq('id', auctionId);

        if (error) return { success: false, error: error.message };
        return { success: true };
    }

    const { data: latestOrder } = await supabaseAdmin
        .from('orders')
        .select('status')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as {
            data: OrderStatusRow | null;
            error: unknown;
        };

    const dealCompleted = latestOrder
        && (latestOrder.status === 'delivered' || latestOrder.status === 'completed' || latestOrder.status === 'pin_verified');

    if (auction.status === 'sold' && !dealCompleted) {
        return { success: false, error: 'This auction has an active deal. It can only be taken down after the order is completed.' };
    }

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
        const isDone = dealCompleted;
        if (!isDone) {
            return { success: false, error: 'There is an active deal on this listing. It cannot be deleted until the order is completed.' };
        }
    }

    await removeListingVideoFiles(auctionId);
    const { error } = await supabaseAdmin
        .from('auctions')
        .delete()
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function sendAuctionCommentAction(
    auctionId: string,
    body: string
): Promise<{ success: boolean; error?: string; commentId?: string }> {
    const supabase = await createServerClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'You must be logged in to comment.' };

    const trimmed = body.trim();
    if (!trimmed) return { success: false, error: 'Comment cannot be empty.' };
    if (trimmed.length > 2000) return { success: false, error: 'Comment is too long (max 2000 characters).' };

    const { data: auctionRecord, error: auctionError } = await admin
        .from('auctions')
        .select('id, status')
        .eq('id', auctionId)
        .maybeSingle();

    const auction = auctionRecord as { id: string; status: string } | null;

    if (auctionError || !auction) return { success: false, error: 'Auction not found.' };
    if (auction.status !== 'active' && auction.status !== 'sold' && auction.status !== 'ended') {
        return { success: false, error: 'Comments are not available on this listing.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('auction_comments') as any)
        .insert({
            auction_id: auctionId,
            user_id: user.id,
            body: trimmed,
        })
        .select('id')
        .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Failed to post comment.' };

    return { success: true, commentId: data.id };
}

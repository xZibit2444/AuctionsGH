'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertNotificationIfEnabled } from '@/lib/notifications';

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
        .select('id, status, seller_id, title')
        .eq('id', auctionId)
        .maybeSingle();

    const auction = auctionRecord as { id: string; status: string; seller_id: string; title: string } | null;

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

    // Tell the seller in the app (the bell). Never for their own comments, and a failure here
    // must not fail the comment. One unread alert per listing, so a busy thread does not pile up.
    if (auction.seller_id && auction.seller_id !== user.id) {
        try {
            const alertTitle = 'New comment on your listing';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existing } = await (admin.from('notifications') as any)
                .select('id')
                .eq('user_id', auction.seller_id)
                .eq('auction_id', auctionId)
                .eq('title', alertTitle)
                .eq('is_read', false)
                .limit(1);
            if (!existing || existing.length === 0) {
                await insertNotificationIfEnabled(admin as never, {
                    user_id: auction.seller_id,
                    type: 'system',
                    title: alertTitle,
                    body: `Someone commented on "${auction.title}". Open the listing to read and reply.`,
                    auction_id: auctionId,
                });
            }
        } catch (e) {
            console.error('Comment alert failed:', e);
        }
    }

    return { success: true, commentId: data.id };
}

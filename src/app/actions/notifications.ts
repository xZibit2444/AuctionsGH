'use server';

import { createClient } from '@/lib/supabase/server';

export async function markAllReadAction(): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // Live notifications schema is ahead of the repo's database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) return { error: error.message };
    return { success: true };
}

/**
 * Marks the caller's unread new-message notifications for one chat thread as
 * read when they are actually viewing that thread (order chat or offer deal
 * chat), so the bell badge and the unread-messages popup only count messages
 * the user has not seen.
 *
 * Offer-thread notifications carry the auction id but no buyer id, so for a
 * seller this also clears other buyers' offer threads on the same listing.
 */
export async function markChatNotificationsReadAction(
    target: { orderId?: string; auctionId?: string }
): Promise<{ success?: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Unauthorized' };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('type', 'new_message')
            .eq('is_read', false);

        if (target.orderId) {
            query = query.eq('order_id', target.orderId);
        } else if (target.auctionId) {
            query = query.eq('auction_id', target.auctionId).is('order_id', null);
        } else {
            return { error: 'orderId or auctionId required' };
        }

        const { error } = await query;
        if (error) return { error: error.message };
        return { success: true };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to mark messages read' };
    }
}

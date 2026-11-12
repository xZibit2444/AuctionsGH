import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Moves the pre-order offer chat (auction_offer_messages for one
 * auction+buyer pair) onto a freshly created order, so the order page shows
 * the full conversation the parties already had. Non-fatal by design: order
 * creation must succeed even if the copy fails.
 */
export async function copyOfferMessagesToOrder(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdmin: SupabaseClient<any>,
    args: { auctionId: string; buyerId: string; orderId: string }
): Promise<void> {
    try {
        const { data: msgs, error } = await supabaseAdmin
            .from('auction_offer_messages')
            .select('sender_id, body, created_at')
            .eq('auction_id', args.auctionId)
            .eq('buyer_id', args.buyerId)
            .order('created_at', { ascending: true });

        if (error || !msgs || msgs.length === 0) return;

        const rows = msgs.map((m: { sender_id: string; body: string; created_at: string }) => ({
            order_id: args.orderId,
            sender_id: m.sender_id,
            body: m.body,
            created_at: m.created_at,
        }));

        const { error: insertErr } = await supabaseAdmin.from('order_messages').insert(rows);
        if (insertErr) console.error('[copyOfferMessagesToOrder] insert:', insertErr);
    } catch (err) {
        console.error('[copyOfferMessagesToOrder]', err);
    }
}

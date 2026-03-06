'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Sends a chat message on an order and notifies the other party.
 * Requires the caller to be the buyer or seller of the order.
 */
export async function sendMessageAction(
    orderId: string,
    body: string,
): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be logged in to send messages.' };

    const trimmed = body.trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty.' };
    if (trimmed.length > 2000) return { success: false, error: 'Message is too long (max 2000 characters).' };

    // Verify caller is a party to this order
    const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('id, buyer_id, seller_id, auction_id, auction:auctions(title)')
        .eq('id', orderId)
        .single();

    if (orderErr || !order) return { success: false, error: 'Order not found.' };

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;
    if (!isBuyer && !isSeller) return { success: false, error: 'Access denied.' };

    // Insert the message
    const { data: msg, error: msgErr } = await supabaseAdmin
        .from('order_messages')
        .insert({ order_id: orderId, sender_id: user.id, body: trimmed })
        .select('id')
        .single();

    if (msgErr || !msg) {
        return { success: false, error: msgErr?.message ?? 'Failed to send message.' };
    }

    // Notify the other party
    const recipientId = isBuyer ? order.seller_id : order.buyer_id;
    const senderLabel = isBuyer ? 'Buyer' : 'Seller';
    const auctionTitle = (order as any).auction?.title ?? 'your order';

    await supabaseAdmin.from('notifications').insert({
        user_id: recipientId,
        type: 'new_message',
        title: `New message from ${senderLabel}`,
        body: trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed,
        order_id: orderId,
        auction_id: order.auction_id,
    });

    return { success: true, messageId: msg.id };
}

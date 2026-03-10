'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Returns the delivery_code for an order — buyer only.
 * If no delivery record exists yet but the caller is the order's buyer,
 * one is created on-the-fly so the buyer always sees a code.
 */
export async function getDeliveryCodeAction(orderId: string): Promise<{ code: string | null; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: null, error: 'Unauthenticated' };

    const { data } = await supabaseAdmin
        .from('deliveries')
        .select('delivery_code, buyer_id')
        .eq('order_id', orderId)
        .single();

    // Delivery record exists — verify ownership and return code
    if (data) {
        if (data.buyer_id !== user.id) return { code: null, error: 'Access denied' };
        return { code: data.delivery_code };
    }

    // No delivery record yet — try to auto-create one if user is the buyer
    const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('id, buyer_id, seller_id, auction_id')
        .eq('id', orderId)
        .single();

    if (orderErr || !order) return { code: null, error: 'Order not found' };
    if (order.buyer_id !== user.id) return { code: null, error: 'Access denied' };

    const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: insertErr } = await supabaseAdmin
        .from('deliveries')
        .insert({
            order_id: orderId,
            auction_id: order.auction_id,
            seller_id: order.seller_id,
            buyer_id: order.buyer_id,
            delivery_code: deliveryCode,
            status: 'pending',
        });

    if (insertErr) return { code: null, error: 'Could not create delivery record' };

    return { code: deliveryCode };
}

/**
 * Seller marks delivery as sent.
 */
export async function markShippedAction(orderId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthenticated' };

    // Verify caller is the seller
    const { data: delivery, error: fetchErr } = await supabaseAdmin
        .from('deliveries')
        .select('id, seller_id, status')
        .eq('order_id', orderId)
        .single();

    if (fetchErr || !delivery) return { success: false, error: 'Delivery not found' };
    if (delivery.seller_id !== user.id) return { success: false, error: 'Access denied' };
    if (delivery.status !== 'pending') return { success: false, error: 'Already sent or delivered' };

    const { error: updateErr } = await supabaseAdmin
        .from('deliveries')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            seller_code_reminder_last_sent_at: null,
        } as never)
        .eq('id', delivery.id);

    if (updateErr) return { success: false, error: 'Failed to update status' };
    return { success: true };
}

/**
 * Seller (or courier via seller's phone) enters the delivery code to confirm delivery.
 * Verifies the code, marks as delivered, and updates the order status.
 */
export async function confirmDeliveryAction(
    orderId: string,
    code: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthenticated' };

    const { data: delivery, error: fetchErr } = await supabaseAdmin
        .from('deliveries')
        .select('id, seller_id, delivery_code, status')
        .eq('order_id', orderId)
        .single();

    if (fetchErr || !delivery) return { success: false, error: 'Delivery not found' };
    if (delivery.seller_id !== user.id) return { success: false, error: 'Access denied' };
    if (delivery.status === 'delivered' || delivery.status === 'completed') {
        return { success: false, error: 'Delivery already confirmed' };
    }
    if (delivery.delivery_code !== code.trim()) {
        return { success: false, error: 'Incorrect delivery code' };
    }

    // Mark delivery as delivered
    const { error: deliveryUpdateErr } = await supabaseAdmin
        .from('deliveries')
        .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            seller_code_reminder_last_sent_at: null,
        } as never)
        .eq('id', delivery.id);

    if (deliveryUpdateErr) return { success: false, error: 'Failed to confirm delivery' };

    // Also update the parent order status to 'completed'
    await supabaseAdmin
        .from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() } as never)
        .eq('id', orderId);

    return { success: true };
}

/**
 * Buyer confirms that the item has been delivered.
 * This moves delivery to completed and marks order as completed.
 */
export async function confirmDeliveredByBuyerAction(
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthenticated' };

    const { data: delivery, error: fetchErr } = await supabaseAdmin
        .from('deliveries')
        .select('id, buyer_id, status')
        .eq('order_id', orderId)
        .single();

    if (fetchErr || !delivery) return { success: false, error: 'Delivery not found' };
    if (delivery.buyer_id !== user.id) return { success: false, error: 'Access denied' };

    if (delivery.status === 'completed') {
        return { success: true };
    }

    if (delivery.status !== 'sent' && delivery.status !== 'delivered') {
        return { success: false, error: 'Seller must mark this order as sent first' };
    }

    const nowIso = new Date().toISOString();

    const { error: deliveryUpdateErr } = await supabaseAdmin
        .from('deliveries')
        .update({ status: 'completed', delivered_at: nowIso } as never)
        .eq('id', delivery.id);

    if (deliveryUpdateErr) return { success: false, error: 'Failed to complete delivery' };

    await supabaseAdmin
        .from('orders')
        .update({ status: 'completed', updated_at: nowIso } as never)
        .eq('id', orderId);

    return { success: true };
}

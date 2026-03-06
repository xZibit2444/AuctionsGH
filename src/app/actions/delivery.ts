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
 * Called from DeliveryCodeDisplay component.
 */
export async function getDeliveryCodeAction(orderId: string): Promise<{ code: string | null; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: null, error: 'Unauthenticated' };

    const { data, error } = await supabaseAdmin
        .from('deliveries')
        .select('delivery_code, buyer_id')
        .eq('order_id', orderId)
        .single();

    if (error || !data) return { code: null, error: 'Delivery not found' };
    if (data.buyer_id !== user.id) return { code: null, error: 'Access denied' };

    return { code: data.delivery_code };
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
        .update({ status: 'sent' })
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
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', delivery.id);

    if (deliveryUpdateErr) return { success: false, error: 'Failed to confirm delivery' };

    // Also update the parent order status to 'completed'
    await supabaseAdmin
        .from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
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
        .update({ status: 'completed', delivered_at: nowIso })
        .eq('id', delivery.id);

    if (deliveryUpdateErr) return { success: false, error: 'Failed to complete delivery' };

    await supabaseAdmin
        .from('orders')
        .update({ status: 'completed', updated_at: nowIso })
        .eq('id', orderId);

    return { success: true };
}

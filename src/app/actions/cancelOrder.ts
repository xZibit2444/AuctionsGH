'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import { isCompletedOrderStatus, isCancelledOrderStatus, isTerminalOrderStatus } from '@/lib/orderStatus';
import { getPrimaryDelivery } from '@/lib/delivery';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

type CancelOrderStatus =
    | 'cancelled_by_buyer'
    | 'cancelled_by_seller'
    | 'cancelled_mutual'
    | 'cancelled_unpaid'
    | 'cancelled_admin';

type CancelReason =
    | 'changed_mind'
    | 'buyer_unreachable'
    | 'item_unavailable'
    | 'mutual_agreement'
    | 'duplicate_order'
    | 'other';

const REASON_LABELS: Record<CancelReason, string> = {
    changed_mind: 'Buyer changed mind',
    buyer_unreachable: 'Buyer unreachable',
    item_unavailable: 'Item no longer available',
    mutual_agreement: 'Mutual agreement',
    duplicate_order: 'Duplicate order',
    other: 'Other',
};

interface CancelOrderArgs {
    orderId: string;
    reason: CancelReason;
    note?: string;
}

export async function cancelOrderAction(
    args: CancelOrderArgs
): Promise<{ success: boolean; error?: string; status?: CancelOrderStatus; auctionAction?: 'reopened' | 'cancelled' | 'unchanged' }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'You must be logged in.' };

    const trimmedNote = args.note?.trim() ?? '';

    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
            id,
            buyer_id,
            seller_id,
            auction_id,
            status,
            fulfillment_type,
            created_at,
            auction:auctions ( id, title, status, winner_id, ends_at ),
            deliveries!deliveries_order_id_fkey ( id, status )
        `)
        .eq('id', args.orderId)
        .single();

    if (orderError || !order) {
        return { success: false, error: 'Order not found.' };
    }

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;
    if (!isBuyer && !isSeller) {
        return { success: false, error: 'Access denied.' };
    }

    if (isCompletedOrderStatus(order.status) || isCancelledOrderStatus(order.status)) {
        return { success: false, error: 'This order can no longer be cancelled.' };
    }

    if (isTerminalOrderStatus(order.status)) {
        return { success: false, error: 'This order is already closed.' };
    }

    const delivery = getPrimaryDelivery(order.deliveries);
    const deliveryStatus = delivery?.status ?? null;
    if (deliveryStatus && deliveryStatus !== 'pending') {
        return { success: false, error: 'Cancellation is only allowed before fulfillment starts.' };
    }

    if (order.status !== 'pending_meetup' && order.status !== 'pending_payment') {
        return { success: false, error: 'This order is too far along to cancel. Use support or dispute handling instead.' };
    }

    if (isBuyer && args.reason === 'item_unavailable') {
        return { success: false, error: 'Use a buyer-side cancellation reason.' };
    }

    if (isSeller && args.reason === 'changed_mind') {
        return { success: false, error: 'Use a seller-side cancellation reason.' };
    }

    const nextStatus: CancelOrderStatus = isBuyer ? 'cancelled_by_buyer' : 'cancelled_by_seller';
    const cancellationReason = trimmedNote
        ? `${REASON_LABELS[args.reason]} — ${trimmedNote}`
        : REASON_LABELS[args.reason];
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
            status: nextStatus,
            cancellation_reason: cancellationReason,
            cancelled_at: nowIso,
            cancelled_by: user.id,
            updated_at: nowIso,
        })
        .eq('id', args.orderId);

    if (updateError) {
        return { success: false, error: updateError.message || 'Failed to cancel order.' };
    }

    let auctionAction: 'reopened' | 'cancelled' | 'unchanged' = 'unchanged';
    const auctionRow = Array.isArray(order.auction) ? order.auction[0] : order.auction;

    if (auctionRow?.id && auctionRow.status === 'sold') {
        if (isBuyer) {
            const { error: reopenError } = await supabaseAdmin
                .from('auctions')
                .update({
                    status: 'active',
                    winner_id: null,
                    ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: nowIso,
                })
                .eq('id', auctionRow.id);

            if (!reopenError) auctionAction = 'reopened';
        } else {
            const { error: cancelAuctionError } = await supabaseAdmin
                .from('auctions')
                .update({
                    status: 'cancelled',
                    winner_id: null,
                    updated_at: nowIso,
                })
                .eq('id', auctionRow.id);

            if (!cancelAuctionError) auctionAction = 'cancelled';
        }
    }

    const recipientId = isBuyer ? order.seller_id : order.buyer_id;
    const actorLabel = isBuyer ? 'buyer' : 'seller';
    const title = auctionRow?.title ?? 'this order';
    const body = isBuyer
        ? `The buyer cancelled the order for "${title}". ${auctionAction === 'reopened' ? 'The listing has been reopened for bidding.' : 'Review the order details for the reason.'}`
        : `The seller cancelled the order for "${title}". ${auctionAction === 'cancelled' ? 'The listing has been taken down.' : 'Review the order details for the reason.'}`;

    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: recipientId,
        type: 'system',
        title: `Order cancelled by ${actorLabel}`,
        body,
        auction_id: order.auction_id,
        order_id: order.id,
    });

    return { success: true, status: nextStatus, auctionAction };
}

'use server';

import { createClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import { isPermanentListing } from '@/lib/listings';
import { FAILED_ORDER_STATUSES } from '@/lib/orderStatus';
import {
    sendOrderConfirmedBuyerEmail,
    sendOrderConfirmedSellerEmail,
} from '@/lib/email/sender';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

interface CheckoutFormData {
    auctionId: string;
    buyerId: string;
    deliveryMethod: 'pickup' | 'delivery';
    amount: number;
    address?: string;
    phone: string;
    name: string;
}

function getDisplayName(profile: { full_name?: string | null; username?: string | null } | null, fallback: string) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

export async function createOrderAction(data: CheckoutFormData) {
    try {
        const { data: auction, error: fetchError } = await supabaseAdmin
            .from('auctions')
            .select('id, title, seller_id, status, winner_id, current_price, ends_at')
            .eq('id', data.auctionId)
            .single();

        if (fetchError || !auction) {
            return { success: false, error: 'Auction not found' };
        }

        let orderAmount = Number(auction.current_price);
        const isSoldWinner = auction.status === 'sold' && auction.winner_id === data.buyerId;

        if (!isSoldWinner) {
            // Permanent listings stay live after an offer is accepted, so the
            // accepted buyer confirms their order while the listing is still
            // active. The agreed offer amount is read from the accepted offer,
            // never from the client.
            if (auction.status !== 'active' || !isPermanentListing(auction.ends_at)) {
                return { success: false, error: 'Invalid auction state or unauthorized' };
            }

            const { data: acceptedOffer } = await supabaseAdmin
                .from('auction_offers')
                .select('id, amount')
                .eq('auction_id', data.auctionId)
                .eq('buyer_id', data.buyerId)
                .eq('status', 'accepted')
                .maybeSingle();

            if (!acceptedOffer) {
                return { success: false, error: 'Invalid auction state or unauthorized' };
            }

            // The listing is still on the market: only one open order can
            // exist, so first buyer to confirm wins the slot. A stale terminal
            // order (cancelled / ghosted / refunded) is removed so the next
            // buyer can confirm - its delivery and PIN rows cascade away.
            const { data: existingOrder } = await supabaseAdmin
                .from('orders')
                .select('id, status')
                .eq('auction_id', data.auctionId)
                .maybeSingle();

            if (existingOrder) {
                if (!FAILED_ORDER_STATUSES.includes(existingOrder.status as typeof FAILED_ORDER_STATUSES[number])) {
                    return { success: false, error: 'A deal for this item is already open with another buyer. If that deal falls through, you can try again.' };
                }
                await supabaseAdmin.from('orders').delete().eq('id', existingOrder.id);
            }

            orderAmount = Number(acceptedOffer.amount);
        }

        const fulfillment_type = 'meet_and_inspect';
        const initial_status = 'pending_meetup';

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                auction_id: data.auctionId,
                buyer_id: data.buyerId,
                seller_id: auction.seller_id,
                fulfillment_type,
                status: initial_status,
                payment_method: 'cod',
                amount: orderAmount,
                meetup_location: data.deliveryMethod === 'pickup' ? 'To be arranged' : data.address,
            })
            .select('id')
            .single();

        if (orderError || !order) {
            console.error('Order creation error:', orderError);
            return { success: false, error: 'Failed to create order. It may already exist.' };
        }

        const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString();

        const { error: deliveryError } = await supabaseAdmin
            .from('deliveries')
            .insert({
                order_id: order.id,
                auction_id: data.auctionId,
                seller_id: auction.seller_id,
                buyer_id: data.buyerId,
                delivery_code: deliveryCode,
                status: 'pending',
            });

        if (deliveryError) {
            console.error('Delivery record creation error:', deliveryError);
        }

        const { data: pin, error: pinError } = await supabaseAdmin.rpc('create_order_pin', {
            p_order_id: order.id,
        });

        if (pinError) {
            console.error('PIN generation error:', pinError);
        }

        await insertNotificationIfEnabled(supabaseAdmin as never, {
            user_id: data.buyerId,
            type: 'system',
            title: 'Order Confirmed - View Your Delivery Code',
            body: `Your order for "${auction.title}" is confirmed. Open your order page to see your 6-digit delivery code. Give it to the courier when your phone arrives.`,
            auction_id: auction.id,
            order_id: order.id,
        });

        await insertNotificationIfEnabled(supabaseAdmin as never, {
            user_id: auction.seller_id,
            type: 'system',
            title: 'Item Sold - Buyer Confirmed Order',
            body: `The buyer confirmed the order for "${auction.title}" with Pay on Delivery. Arrange handover and confirm delivery from your order dashboard.`,
            auction_id: auction.id,
            order_id: order.id,
        });

        const [{ data: buyerProfile }, { data: sellerProfile }, buyerAuthResult, sellerAuthResult] = await Promise.all([
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', data.buyerId).maybeSingle(),
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', auction.seller_id).maybeSingle(),
            supabaseAdmin.auth.admin.getUserById(data.buyerId),
            supabaseAdmin.auth.admin.getUserById(auction.seller_id),
        ]);

        const buyerName = getDisplayName(
            buyerProfile as { full_name?: string | null; username?: string | null } | null,
            'Buyer'
        );
        const sellerName = getDisplayName(
            sellerProfile as { full_name?: string | null; username?: string | null } | null,
            'Seller'
        );

        if (buyerAuthResult.data.user?.email) {
            const buyerEmailResult = await sendOrderConfirmedBuyerEmail(
                buyerAuthResult.data.user.email,
                buyerName,
                auction.title,
                order.id
            );

            if (!buyerEmailResult.success) {
                console.error('Failed to send buyer order confirmation email:', buyerEmailResult.error);
            }
        }

        if (sellerAuthResult.data.user?.email) {
            const sellerEmailResult = await sendOrderConfirmedSellerEmail(
                sellerAuthResult.data.user.email,
                sellerName,
                auction.title,
                order.id
            );

            if (!sellerEmailResult.success) {
                console.error('Failed to send seller order confirmation email:', sellerEmailResult.error);
            }
        }

        void pin;

        return { success: true, orderId: order.id };
    } catch (err: unknown) {
        console.error('Checkout error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to create order',
        };
    }
}

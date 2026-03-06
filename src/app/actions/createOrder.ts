'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
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

export async function createOrderAction(data: CheckoutFormData) {
    try {
        // Fetch the auction to verify and get seller info
        const { data: auction, error: fetchError } = await supabaseAdmin
            .from('auctions')
            .select('id, title, seller_id, status, winner_id')
            .eq('id', data.auctionId)
            .single();

        if (fetchError || !auction) {
            return { success: false, error: 'Auction not found' };
        }

        if (auction.status !== 'sold' || auction.winner_id !== data.buyerId) {
            return { success: false, error: 'Invalid auction state or unauthorized' };
        }

        // Pay on delivery only.
        const fulfillment_type = 'meet_and_inspect';
        const initial_status = 'pending_meetup';

        // 1. Insert the order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                auction_id: data.auctionId,
                buyer_id: data.buyerId,
                seller_id: auction.seller_id,
                fulfillment_type,
                status: initial_status,
                payment_method: 'cod',
                amount: data.amount,
                meetup_location: data.deliveryMethod === 'pickup' ? 'To be arranged' : data.address,
            })
            .select('id')
            .single();

        if (orderError || !order) {
            console.error('Order creation error:', orderError);
            return { success: false, error: 'Failed to create order. It may already exist.' };
        }

        // 2. Create the delivery record with a 6-digit code
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
            // Non-fatal — order still created; log but don't block
        }

        // 3. Generate the PIN via the RPC function (legacy / meet-and-inspect)
        const { data: pin, error: pinError } = await supabaseAdmin.rpc('create_order_pin', {
            p_order_id: order.id
        });

        if (pinError) {
            console.error('PIN generation error:', pinError);
        }

        // 4. Send Notifications

        // Notify Buyer — tell them where to find their delivery code
        await supabaseAdmin.from('notifications').insert({
            user_id: data.buyerId,
            type: 'system',
            title: 'Order Confirmed — View Your Delivery Code',
            body: `Your order for "${auction.title}" is confirmed. Open your order page to see your 6-digit delivery code. Give it to the courier when your phone arrives.`,
            auction_id: auction.id,
            order_id: order.id
        });

        // Notify Seller of the sale and next steps
        await supabaseAdmin.from('notifications').insert({
            user_id: auction.seller_id,
            type: 'system',
            title: 'Item Sold — Buyer Confirmed Order',
            body: `The buyer confirmed the order for "${auction.title}" with Pay on Delivery. Arrange handover and confirm delivery from your order dashboard.`,
            auction_id: auction.id,
            order_id: order.id
        });

        void pin; // retained for legacy PIN support

        return { success: true, orderId: order.id };

    } catch (err: any) {
        console.error('Checkout error:', err);
        return { success: false, error: err.message };
    }
}

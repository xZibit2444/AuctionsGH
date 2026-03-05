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
    paymentMethod: 'escrow' | 'cod';
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

        // Determine fulfillment type and initial status based on delivery method AND payment method.
        // If they choose pickup OR cash on delivery, it behaves essentially the same (physical exchange of money/item at the end).
        const reliesOnEscrow = data.deliveryMethod === 'delivery' && data.paymentMethod === 'escrow';

        const fulfillment_type = reliesOnEscrow ? 'escrow_delivery' : 'meet_and_inspect';
        const initial_status = reliesOnEscrow ? 'funds_held' : 'pending_meetup';

        // 1. Insert the order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                auction_id: data.auctionId,
                buyer_id: data.buyerId,
                seller_id: auction.seller_id,
                fulfillment_type,
                status: initial_status,
                payment_method: data.paymentMethod,
                amount: data.amount,
                meetup_location: data.deliveryMethod === 'pickup' ? 'To be arranged' : data.address,
            })
            .select('id')
            .single();

        if (orderError || !order) {
            console.error('Order creation error:', orderError);
            return { success: false, error: 'Failed to create order. It may already exist.' };
        }

        // 2. Generate the PIN via the RPC function
        const { data: pin, error: pinError } = await supabaseAdmin.rpc('create_order_pin', {
            p_order_id: order.id
        });

        if (pinError) {
            console.error('PIN generation error:', pinError);
            // We won't block the whole flow, but we need to log it
        }

        // 3. Send Notifications

        // Notify Buyer with their PIN
        await supabaseAdmin.from('notifications').insert({
            user_id: data.buyerId,
            type: 'system',
            title: 'Order Confirmed - Your Secret PIN',
            body: `Your order for "${auction.title}" is confirmed. Your secret delivery PIN is ${pin}. DO NOT share this with the seller until you have inspected the item.`,
            auction_id: auction.id
        });

        // Notify Seller of the sale and next steps
        await supabaseAdmin.from('notifications').insert({
            user_id: auction.seller_id,
            type: 'system',
            title: 'Item Sold & Paid!',
            body: `The buyer has completed checkout for "${auction.title}". Please check your order dashboard to arrange ${data.deliveryMethod === 'pickup' ? 'meetup' : 'delivery'}.`,
            auction_id: auction.id
        });

        return { success: true, orderId: order.id };

    } catch (err: any) {
        console.error('Checkout error:', err);
        return { success: false, error: err.message };
    }
}

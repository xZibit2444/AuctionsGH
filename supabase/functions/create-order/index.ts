import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * create-order
 *
 * Called after an auction closes. Only the auction winner or seller can create an order.
 *
 * Body: {
 *   auction_id: string;
 *   fulfillment_type: 'meet_and_inspect' | 'escrow_delivery';
 *   meetup_location?: string;
 *   meetup_at?: string;
 * }
 */
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Authenticate caller
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return jsonError('Unauthorized', 401);

        const { data: { user }, error: authErr } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (authErr || !user) return jsonError('Unauthorized', 401);

        const body = await req.json();
        const { auction_id, fulfillment_type, meetup_location, meetup_at } = body as {
            auction_id: string;
            fulfillment_type: 'meet_and_inspect' | 'escrow_delivery';
            meetup_location?: string;
            meetup_at?: string;
        };

        if (!auction_id || !fulfillment_type) {
            return jsonError('auction_id and fulfillment_type are required', 400);
        }

        // 1. Fetch auction
        const { data: auction, error: auctionErr } = await supabase
            .from('auctions')
            .select('id, seller_id, winner_id, current_price, status, title')
            .eq('id', auction_id)
            .single();

        if (auctionErr || !auction) return jsonError('Auction not found', 404);
        if (auction.status !== 'sold') return jsonError('Auction has not been won yet', 422);
        if (!auction.winner_id) return jsonError('Auction has no winner', 422);

        // Authorize: only the winner or seller can create an order
        if (user.id !== auction.winner_id && user.id !== auction.seller_id) {
            return jsonError('Only the auction winner or seller can create an order', 403);
        }

        // 2. For meet_and_inspect: ensure buyer has a live deposit
        if (fulfillment_type === 'meet_and_inspect') {
            const { data: deposit } = await supabase
                .from('deposits')
                .select('id')
                .eq('user_id', auction.winner_id)
                .eq('status', 'held')
                .maybeSingle();

            if (!deposit) {
                return jsonError('Buyer does not have an active bidding deposit', 422);
            }

            if (!meetup_location || !meetup_at) {
                return jsonError('meetup_location and meetup_at are required for meet_and_inspect', 400);
            }
        }

        // 3. Create the order
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .insert({
                auction_id,
                buyer_id: auction.winner_id,
                seller_id: auction.seller_id,
                fulfillment_type,
                status: fulfillment_type === 'escrow_delivery' ? 'pending_payment' : 'pending_meetup',
                amount: auction.current_price,
                meetup_location: meetup_location ?? null,
                meetup_at: meetup_at ?? null,
            })
            .select('id')
            .single();

        if (orderErr || !order) return jsonError('Failed to create order', 500);

        const orderId = order.id;

        // 4. Escrow & Delivery: create escrow record + generate PIN
        let plainPin: string | null = null;
        if (fulfillment_type === 'escrow_delivery') {
            await supabase.from('escrow_payments').insert({
                order_id: orderId,
                buyer_id: auction.winner_id,
                seller_id: auction.seller_id,
                amount: auction.current_price,
                status: 'pending',
            });

            const { data: pinData } = await supabase
                .rpc('create_order_pin', { p_order_id: orderId });

            plainPin = pinData as string;
        }

        // 5. Notify buyer
        await supabase.from('notifications').insert({
            user_id: auction.winner_id,
            type: 'auction_won',
            title: '🎉 You won! Complete your purchase',
            body: fulfillment_type === 'escrow_delivery'
                ? `Pay ₵${auction.current_price} into escrow to secure "${auction.title}". Your delivery PIN is: ${plainPin}`
                : `Arrange a meetup with the seller to collect "${auction.title}".`,
            auction_id,
        });

        // 6. Notify seller
        await supabase.from('notifications').insert({
            user_id: auction.seller_id,
            type: 'auction_ended',
            title: '📦 Your auction sold — order created',
            body: fulfillment_type === 'escrow_delivery'
                ? `Prepare "${auction.title}" for delivery. Funds will be released once the buyer confirms.`
                : `Arrange a meetup with the buyer to hand over "${auction.title}".`,
            auction_id,
        });

        return new Response(JSON.stringify({ ok: true, order_id: orderId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
        });
    } catch (err) {
        console.error('[create-order]', err);
        return jsonError('Internal server error', 500);
    }
});

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * refuse-delivery
 *
 * Buyer explicitly refuses to accept the phone after delivery.
 * This triggers the return flow and initiates a full escrow refund.
 *
 * Body: { order_id: string }
 * Auth: Must be the buyer on the order.
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

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return jsonError('Unauthorized', 401);

        const { data: { user }, error: authErr } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (authErr || !user) return jsonError('Unauthorized', 401);

        const { order_id } = await req.json() as { order_id: string };
        if (!order_id) return jsonError('order_id is required', 400);

        // Fetch order
        const { data: order } = await supabase
            .from('orders')
            .select('id, buyer_id, seller_id, status, amount, fulfillment_type')
            .eq('id', order_id)
            .single();

        if (!order) return jsonError('Order not found', 404);
        if (order.buyer_id !== user.id) return jsonError('Only the buyer can refuse delivery', 403);
        if (order.fulfillment_type !== 'escrow_delivery') {
            return jsonError('Delivery refusal only applies to Escrow & Delivery orders', 422);
        }
        if (order.status !== 'in_delivery') {
            return jsonError(`Cannot refuse delivery on order with status "${order.status}"`, 422);
        }

        // Transition: in_delivery → pin_refused → returning
        await supabase
            .from('orders')
            .update({ status: 'returning', updated_at: new Date().toISOString() })
            .eq('id', order_id);

        // Refund escrow
        await supabase
            .from('escrow_payments')
            .update({
                status: 'refunded',
                refunded_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('order_id', order_id);

        // Release buyer's deposit (they showed up, just refused the phone)
        await supabase
            .from('deposits')
            .update({ status: 'released', updated_at: new Date().toISOString() })
            .eq('user_id', order.buyer_id)
            .eq('status', 'held');

        // Notify buyer
        await supabase.from('notifications').insert({
            user_id: order.buyer_id,
            type: 'auction_ended',
            title: '↩️ Delivery Refused',
            body: `You refused the delivery. Your escrow payment of ₵${order.amount} will be refunded.`,
        });

        // Notify seller
        await supabase.from('notifications').insert({
            user_id: order.seller_id,
            type: 'auction_ended',
            title: '📦 Phone Being Returned',
            body: 'The buyer refused delivery. The phone is being returned to you by the rider.',
        });

        return new Response(
            JSON.stringify({ ok: true, message: 'Delivery refused. Escrow refunded. Phone returning to seller.' }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (err) {
        console.error('[refuse-delivery]', err);
        return jsonError('Internal server error', 500);
    }
});

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

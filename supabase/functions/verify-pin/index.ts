import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * verify-pin
 *
 * Buyer submits their 4-digit PIN to confirm receipt of the phone.
 * PIN verification is handled atomically in the DB via verify_order_pin().
 *
 * Body: { order_id: string; pin: string }
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

        const { order_id, pin } = await req.json() as { order_id: string; pin: string };

        if (!order_id || !pin) return jsonError('order_id and pin are required', 400);
        if (!/^\d{4}$/.test(pin)) return jsonError('PIN must be exactly 4 digits', 422);

        // Fetch order first to auth-check the buyer
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return jsonError('Unauthorized', 401);

        const { data: { user }, error: authErr } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (authErr || !user) return jsonError('Unauthorized', 401);

        const { data: order } = await supabase
            .from('orders')
            .select('buyer_id, seller_id, status, amount')
            .eq('id', order_id)
            .single();

        if (!order) return jsonError('Order not found', 404);
        if (order.buyer_id !== user.id) return jsonError('Only the buyer can verify the PIN', 403);
        if (order.status !== 'in_delivery') {
            return jsonError(`Cannot verify PIN when order status is "${order.status}"`, 422);
        }

        // Call the atomic DB function
        const { data: result } = await supabase
            .rpc('verify_order_pin', { p_order_id: order_id, p_pin: pin });

        const outcome = result as string;

        if (outcome === 'verified') {
            // Move order to completed
            await supabase
                .from('orders')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', order_id);

            // Release escrow to seller
            await supabase
                .from('escrow_payments')
                .update({ status: 'released', released_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('order_id', order_id);

            // Release buyer's deposit
            await supabase
                .from('deposits')
                .update({ status: 'released', updated_at: new Date().toISOString() })
                .eq('user_id', order.buyer_id)
                .eq('status', 'held');

            // Notify seller their funds are released
            await supabase.from('notifications').insert({
                user_id: order.seller_id,
                type: 'auction_ended',
                title: '💰 Funds Released!',
                body: `The buyer confirmed receipt. ₵${order.amount} is being released to you.`,
            });

            return jsonOk({ outcome: 'verified', message: 'PIN confirmed. Escrow released to seller.' });
        }

        if (outcome === 'max_attempts' || outcome === 'expired') {
            // Auto-trigger refund flow
            await triggerRefund(supabase, order_id, order.buyer_id, order.seller_id, order.amount);
            return jsonOk({
                outcome,
                message: outcome === 'expired'
                    ? 'PIN expired. Order refunded.'
                    : 'Maximum PIN attempts reached. Order refunded.',
            });
        }

        // Wrong PIN — return remaining attempts
        const { data: pinRow } = await supabase
            .from('order_pins')
            .select('attempts, max_attempts')
            .eq('order_id', order_id)
            .single();

        const remaining = pinRow ? (pinRow.max_attempts - pinRow.attempts) : 0;
        return new Response(JSON.stringify({ outcome: 'wrong_pin', attempts_remaining: remaining }), {
            headers: { 'Content-Type': 'application/json' },
            status: 422,
        });
    } catch (err) {
        console.error('[verify-pin]', err);
        return jsonError('Internal server error', 500);
    }
});

async function triggerRefund(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    orderId: string,
    buyerId: string,
    sellerId: string,
    amount: number
) {
    await supabase
        .from('orders')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', orderId);

    await supabase
        .from('escrow_payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('order_id', orderId);

    await supabase.from('notifications').insert([
        {
            user_id: buyerId,
            type: 'auction_ended',
            title: '↩️ Delivery Refunded',
            body: `Your escrow payment of ₵${amount} is being returned to you.`,
        },
        {
            user_id: sellerId,
            type: 'auction_ended',
            title: '📦 Delivery Refused',
            body: 'The buyer did not confirm receipt. The phone should be returned to you.',
        },
    ]);
}

function jsonOk(data: unknown): Response {
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
}

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

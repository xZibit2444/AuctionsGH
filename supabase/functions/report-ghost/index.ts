import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * report-ghost
 *
 * Seller reports that the buyer did not show up for a Meet & Inspect handover.
 * Can only be called 2+ hours after the scheduled meetup_at time.
 *
 * Body: { order_id: string }
 * Auth: Must be the seller on the order.
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
            .select('id, buyer_id, seller_id, status, amount, meetup_at, fulfillment_type')
            .eq('id', order_id)
            .single();

        if (!order) return jsonError('Order not found', 404);
        if (order.seller_id !== user.id) return jsonError('Only the seller can report a ghost', 403);
        if (order.fulfillment_type !== 'meet_and_inspect') {
            return jsonError('Ghost reports only apply to Meet & Inspect orders', 422);
        }
        if (order.status !== 'pending_meetup') {
            return jsonError(`Cannot report ghost on order with status "${order.status}"`, 422);
        }

        // Enforce 2-hour ghost window
        if (!order.meetup_at) return jsonError('No meetup time scheduled for this order', 422);

        const ghostWindow = new Date(order.meetup_at);
        ghostWindow.setHours(ghostWindow.getHours() + 2);

        if (new Date() < ghostWindow) {
            const minutesLeft = Math.ceil((ghostWindow.getTime() - Date.now()) / 60000);
            return jsonError(
                `Ghost can only be reported ${minutesLeft} minute(s) after the meetup window closes.`,
                422
            );
        }

        // Mark order as ghosted
        await supabase
            .from('orders')
            .update({
                status: 'ghosted',
                ghost_reported_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', order_id);

        // Forfeit buyer's deposit
        const { data: deposit } = await supabase
            .from('deposits')
            .select('id')
            .eq('user_id', order.buyer_id)
            .eq('status', 'held')
            .maybeSingle();

        if (deposit) {
            await supabase
                .from('deposits')
                .update({
                    status: 'forfeited',
                    order_id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', deposit.id);
        }

        // Notify buyer
        await supabase.from('notifications').insert({
            user_id: order.buyer_id,
            type: 'auction_ended',
            title: '⚠️ No-show reported',
            body: `The seller reported you didn't turn up. Your ₵50 deposit has been forfeited.`,
        });

        // Notify seller
        await supabase.from('notifications').insert({
            user_id: order.seller_id,
            type: 'auction_ended',
            title: '✅ Ghost report submitted',
            body: `Your ghost report was accepted. The buyer's ₵50 deposit has been forfeited to you.`,
        });

        return new Response(
            JSON.stringify({ ok: true, message: "Ghost reported. Buyer's deposit forfeited." }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (err) {
        console.error('[report-ghost]', err);
        return jsonError('Internal server error', 500);
    }
});

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    });
}

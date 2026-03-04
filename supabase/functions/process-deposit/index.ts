import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * process-deposit
 *
 * Manages bidding deposits (₵50 fixed amount).
 * Authenticated: users can only manage their own deposits.
 *
 * Body: { action: 'hold' | 'release' }
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

        const { action } = await req.json() as { action: 'hold' | 'release' };
        if (!action) return jsonError('action is required', 400);

        // Use the authenticated user's ID — never trust a user_id from the request body
        const user_id = user.id;

        if (action === 'hold') {
            // Check if user already has a held deposit
            const { data: existing } = await supabase
                .from('deposits')
                .select('id, status')
                .eq('user_id', user_id)
                .eq('status', 'held')
                .maybeSingle();

            if (existing) {
                return jsonError('User already has an active deposit', 422);
            }

            // Create new held deposit
            const { data, error } = await supabase
                .from('deposits')
                .insert({
                    user_id,
                    amount: 50.00,
                    status: 'held',
                })
                .select('id')
                .single();

            if (error) return jsonError('Failed to create deposit', 500);

            return jsonOk({ deposit_id: data.id, status: 'held', amount: 50.00 });
        }

        if (action === 'release') {
            const { data: deposit, error: fetchErr } = await supabase
                .from('deposits')
                .select('id')
                .eq('user_id', user_id)
                .eq('status', 'held')
                .maybeSingle();

            if (fetchErr || !deposit) return jsonError('No held deposit found', 404);

            const { error } = await supabase
                .from('deposits')
                .update({ status: 'released', updated_at: new Date().toISOString() })
                .eq('id', deposit.id);

            if (error) return jsonError('Failed to release deposit', 500);

            // Notify user
            await supabase.from('notifications').insert({
                user_id,
                type: 'new_bid',
                title: '💰 Deposit Released',
                body: 'Your ₵50 bidding deposit has been released back to you.',
            });

            return jsonOk({ status: 'released' });
        }

        return jsonError('Invalid action. Use "hold" or "release"', 400);
    } catch (err) {
        console.error('[process-deposit]', err);
        return jsonError('Internal server error', 500);
    }
});

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

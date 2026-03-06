import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * 10 confirmation attempts per 10-minute window per user.
 * Protects the 6-digit delivery code from brute-force attacks.
 */
const CONFIRM_LIMIT = 10;
const CONFIRM_WINDOW_MS = 10 * 60_000;

/**
 * POST /api/delivery/confirm
 * Body: { orderId, code }
 * Seller enters delivery code to confirm the item was received.
 */
export async function POST(req: NextRequest) {
    try {
        // Authenticate caller
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }

        // Rate-limit per user — prevents brute-forcing the 6-digit delivery code
        const rl = rateLimit(`delivery-confirm:${user.id}`, CONFIRM_LIMIT, CONFIRM_WINDOW_MS);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Too many attempts. Please wait before trying again.' },
                { status: 429, headers: rateLimitHeaders(rl) }
            );
        }

        const { orderId, code } = await req.json();

        if (!orderId || !code) {
            return NextResponse.json({ error: 'orderId and code are required' }, { status: 400 });
        }

        const { data: delivery, error: fetchErr } = await supabaseAdmin
            .from('deliveries')
            .select('id, seller_id, delivery_code, status')
            .eq('order_id', orderId)
            .single();

        if (fetchErr || !delivery) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
        }

        // Only the seller can confirm
        if (delivery.seller_id !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Code already used
        if (delivery.status === 'delivered' || delivery.status === 'completed') {
            return NextResponse.json({ error: 'Delivery already confirmed' }, { status: 409 });
        }

        // Verify code
        if (delivery.delivery_code !== code.trim()) {
            return NextResponse.json({ error: 'Incorrect delivery code' }, { status: 422 });
        }

        // Mark delivery as delivered
        const { error: updateErr } = await supabaseAdmin
            .from('deliveries')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', delivery.id);

        if (updateErr) {
            return NextResponse.json({ error: 'Failed to confirm delivery' }, { status: 500 });
        }

        // Update order status to completed
        await supabaseAdmin
            .from('orders')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', orderId);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delivery confirm handler error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

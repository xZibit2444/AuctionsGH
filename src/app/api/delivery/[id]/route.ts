import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/delivery/[id]
 * Returns delivery by delivery ID.
 * delivery_code is only included if the caller is the buyer.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
        }

        const { data: delivery, error } = await supabaseAdmin
            .from('deliveries')
            .select('id, auction_id, order_id, seller_id, buyer_id, delivery_code, status, delivered_at, created_at')
            .eq('id', id)
            .single();

        if (error || !delivery) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
        }

        // Access control
        if (delivery.buyer_id !== user.id && delivery.seller_id !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Strip delivery_code for sellers — only buyers may see it
        const response = delivery.buyer_id === user.id
            ? delivery
            : { ...delivery, delivery_code: undefined };

        return NextResponse.json({ delivery: response });
    } catch (err) {
        console.error('Delivery GET handler error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

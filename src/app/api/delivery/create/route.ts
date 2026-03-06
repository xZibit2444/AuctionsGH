import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function generateDeliveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/delivery/create
 * Body: { orderId, auctionId, sellerId, buyerId }
 * Used internally by createOrder server action.
 */
export async function POST(req: NextRequest) {
    try {
        const { orderId, auctionId, sellerId, buyerId } = await req.json();

        if (!orderId || !auctionId || !sellerId || !buyerId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check not already created
        const { data: existing } = await supabaseAdmin
            .from('deliveries')
            .select('id')
            .eq('order_id', orderId)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Delivery already exists for this order' }, { status: 409 });
        }

        const delivery_code = generateDeliveryCode();

        const { data, error } = await supabaseAdmin
            .from('deliveries')
            .insert({
                order_id: orderId,
                auction_id: auctionId,
                seller_id: sellerId,
                buyer_id: buyerId,
                delivery_code,
                status: 'pending',
            })
            .select('id, status, created_at')
            .single();

        if (error) {
            console.error('Create delivery error:', error);
            return NextResponse.json({ error: 'Failed to create delivery record' }, { status: 500 });
        }

        return NextResponse.json({ success: true, delivery: data });
    } catch (err) {
        console.error('Delivery create handler error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

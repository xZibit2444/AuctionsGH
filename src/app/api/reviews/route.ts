import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reviewSchema = z.object({
    order_id: z.string().uuid(),
    reviewee_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { order_id, reviewee_id, rating, comment } = parsed.data;

    // Verify the order exists, is complete, and this user is a party to it
    const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .select('id, buyer_id, seller_id, status')
        .eq('id', order_id)
        .single();

    if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const isParty = order.buyer_id === user.id || order.seller_id === user.id;
    if (!isParty) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isCompleted = order.status === 'completed' || order.status === 'pin_verified';
    if (!isCompleted) {
        return NextResponse.json({ error: 'Order is not yet completed' }, { status: 422 });
    }

    // reviewee must be the other party
    const otherParty = order.buyer_id === user.id ? order.seller_id : order.buyer_id;
    if (reviewee_id !== otherParty) {
        return NextResponse.json({ error: 'Invalid reviewee' }, { status: 400 });
    }

    const { error: insertError } = await (supabase as any).from('user_reviews').insert({
        order_id,
        reviewer_id: user.id,
        reviewee_id,
        rating,
        comment: comment ?? null,
    });

    if (insertError) {
        if (insertError.code === '23505') {
            return NextResponse.json({ error: 'You have already reviewed this order' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
}

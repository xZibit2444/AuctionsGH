import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import { isTerminalOrderStatus } from '@/lib/orderStatus';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: orderId } = await params;

    // Authenticate via Bearer token
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { body: rawBody } = await req.json() as { body?: string };
    const trimmed = (rawBody ?? '').trim();
    if (!trimmed) return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    if (trimmed.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars).' }, { status: 400 });

    // Verify caller is buyer or seller
    const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('id, buyer_id, seller_id, status')
        .eq('id', orderId)
        .single();

    if (orderErr || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;
    if (!isBuyer && !isSeller) return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    if (isTerminalOrderStatus(order.status)) return NextResponse.json({ error: 'Chat is closed for this order.' }, { status: 400 });

    // Insert message
    const { data: msg, error: msgErr } = await supabaseAdmin
        .from('order_messages' as never)
        .insert({ order_id: orderId, sender_id: user.id, body: trimmed })
        .select('id')
        .single();

    if (msgErr || !msg) return NextResponse.json({ error: (msgErr as { message?: string })?.message ?? 'Failed to send.' }, { status: 500 });

    // Notify other party
    const recipientId = isBuyer ? order.seller_id : order.buyer_id;
    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: recipientId,
        type: 'new_message',
        title: `New message from ${isBuyer ? 'Buyer' : 'Seller'}`,
        body: trimmed.length > 100 ? `${trimmed.slice(0, 100)}…` : trimmed,
        order_id: orderId,
    });

    return NextResponse.json({ success: true, messageId: (msg as { id: string }).id });
}

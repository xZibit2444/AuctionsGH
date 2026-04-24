import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import {
    sendOrderConfirmedBuyerEmail,
    sendOrderConfirmedSellerEmail,
} from '@/lib/email/sender';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getDisplayName(
    profile: { full_name?: string | null; username?: string | null } | null,
    fallback: string
) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

/**
 * POST /api/orders
 * Mobile checkout — creates an order for an auction the caller won.
 * Auth: Bearer <access_token>
 * Body: { auctionId, deliveryMethod, amount, phone, name, address? }
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: {
        auctionId?: string;
        deliveryMethod?: string;
        amount?: number;
        phone?: string;
        name?: string;
        address?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { auctionId, deliveryMethod, amount, phone, name, address } = body;

    if (!auctionId || !deliveryMethod || !amount || !phone || !name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (deliveryMethod !== 'pickup' && deliveryMethod !== 'delivery') {
        return NextResponse.json({ error: 'Invalid deliveryMethod' }, { status: 400 });
    }

    try {
        const { data: auction, error: fetchErr } = await supabaseAdmin
            .from('auctions')
            .select('id, title, seller_id, status, winner_id')
            .eq('id', auctionId)
            .single();

        if (fetchErr || !auction) {
            return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
        }

        if (auction.status !== 'sold' || auction.winner_id !== user.id) {
            return NextResponse.json({ error: 'You are not the winner of this auction' }, { status: 403 });
        }

        const { data: order, error: orderErr } = await supabaseAdmin
            .from('orders')
            .insert({
                auction_id: auctionId,
                buyer_id: user.id,
                seller_id: auction.seller_id,
                fulfillment_type: 'meet_and_inspect',
                status: 'pending_meetup',
                payment_method: 'cod',
                amount,
                meetup_location: deliveryMethod === 'pickup' ? 'To be arranged' : (address ?? ''),
            })
            .select('id')
            .single();

        if (orderErr || !order) {
            console.error('[POST /api/orders] order insert:', orderErr);
            return NextResponse.json(
                { error: 'Failed to create order. It may already exist.' },
                { status: 500 }
            );
        }

        const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString();

        const { error: deliveryErr } = await supabaseAdmin
            .from('deliveries')
            .insert({
                order_id: order.id,
                auction_id: auctionId,
                seller_id: auction.seller_id,
                buyer_id: user.id,
                delivery_code: deliveryCode,
                status: 'pending',
            });

        if (deliveryErr) console.error('[POST /api/orders] delivery insert:', deliveryErr);

        const { error: pinErr } = await supabaseAdmin.rpc('create_order_pin', {
            p_order_id: order.id,
        });
        if (pinErr) console.error('[POST /api/orders] pin rpc:', pinErr);

        await Promise.all([
            insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: user.id,
                type: 'system',
                title: 'Order Confirmed — View Your Delivery Code',
                body: `Your order for "${auction.title}" is confirmed. Open your order page to see your 6-digit delivery code.`,
                auction_id: auction.id,
                order_id: order.id,
            }),
            insertNotificationIfEnabled(supabaseAdmin as never, {
                user_id: auction.seller_id,
                type: 'system',
                title: 'Item Sold — Buyer Confirmed Order',
                body: `The buyer confirmed the order for "${auction.title}" with Pay on Delivery. Arrange handover and confirm delivery.`,
                auction_id: auction.id,
                order_id: order.id,
            }),
        ]);

        const [{ data: buyerProfile }, { data: sellerProfile }, buyerAuth, sellerAuth] = await Promise.all([
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle(),
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', auction.seller_id).maybeSingle(),
            supabaseAdmin.auth.admin.getUserById(user.id),
            supabaseAdmin.auth.admin.getUserById(auction.seller_id),
        ]);

        const buyerName = getDisplayName(
            buyerProfile as { full_name?: string | null; username?: string | null } | null,
            name
        );
        const sellerName = getDisplayName(
            sellerProfile as { full_name?: string | null; username?: string | null } | null,
            'Seller'
        );

        if (buyerAuth.data.user?.email) {
            await sendOrderConfirmedBuyerEmail(
                buyerAuth.data.user.email, buyerName, auction.title, order.id
            ).catch((e) => console.error('[POST /api/orders] buyer email:', e));
        }
        if (sellerAuth.data.user?.email) {
            await sendOrderConfirmedSellerEmail(
                sellerAuth.data.user.email, sellerName, auction.title, order.id
            ).catch((e) => console.error('[POST /api/orders] seller email:', e));
        }

        return NextResponse.json({ success: true, orderId: order.id });
    } catch (err) {
        console.error('[POST /api/orders]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

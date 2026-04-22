import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { insertNotificationIfEnabled } from '@/lib/notifications';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

type AuthUser = { id: string };

async function getAuth(request: Request): Promise<AuthUser | null> {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return { id: user.id };

    const bearer = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!bearer) return null;
    const { data, error: tokenErr } = await supabaseAdmin.auth.getUser(bearer);
    return tokenErr || !data.user ? null : { id: data.user.id };
}

// Resolve buyerId for this request.
// Buyers: buyerId = auth user. Sellers: buyerId must be provided in the request.
async function resolveBuyerId(
    auctionSellerId: string,
    userId: string,
    requestedBuyerId: string | null | undefined
): Promise<{ buyerId: string | null; errorMsg?: string }> {
    if (auctionSellerId === userId) {
        if (!requestedBuyerId || !UUID_REGEX.test(requestedBuyerId))
            return { buyerId: null, errorMsg: 'buyer_id required for seller' };
        return { buyerId: requestedBuyerId };
    }
    return { buyerId: userId };
}

// GET /api/offers/messages?auction_id=<uuid>[&buyer_id=<uuid>]
export async function GET(request: Request) {
    const user = await getAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auction_id');
    if (!auctionId || !UUID_REGEX.test(auctionId))
        return NextResponse.json({ error: 'Valid auction_id required' }, { status: 400 });

    const { data: auction } = await supabaseAdmin
        .from('auctions').select('seller_id').eq('id', auctionId).maybeSingle();
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 });

    const { buyerId, errorMsg } = await resolveBuyerId(
        auction.seller_id, user.id, searchParams.get('buyer_id')
    );
    if (!buyerId) return NextResponse.json({ error: errorMsg }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.from('auction_offer_messages') as any)
        .select('id, auction_id, buyer_id, seller_id, sender_id, body, created_at')
        .eq('auction_id', auctionId)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: true })
        .limit(200);

    if (error) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
}

// POST /api/offers/messages
// Body: { auction_id: string; body: string; buyer_id?: string }
export async function POST(request: Request) {
    const user = await getAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { auction_id?: string; body?: string; buyer_id?: string };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { auction_id, body: msgBody, buyer_id: requestedBuyerId } = body;
    if (!auction_id || !UUID_REGEX.test(auction_id))
        return NextResponse.json({ error: 'Valid auction_id required' }, { status: 400 });

    const text = msgBody?.trim() ?? '';
    if (!text) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000)' }, { status: 400 });

    const { data: auction } = await supabaseAdmin
        .from('auctions').select('id, title, seller_id, status').eq('id', auction_id).maybeSingle();
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 });

    const isSeller = auction.seller_id === user.id;
    const { buyerId, errorMsg } = await resolveBuyerId(auction.seller_id, user.id, requestedBuyerId);
    if (!buyerId) return NextResponse.json({ error: errorMsg }, { status: 400 });

    // Buyers must have an existing offer before chatting
    if (!isSeller) {
        const { data: existingOffer } = await supabaseAdmin
            .from('auction_offers')
            .select('id').eq('auction_id', auction_id).eq('buyer_id', buyerId)
            .limit(1).maybeSingle();
        if (!existingOffer)
            return NextResponse.json({ error: 'Send an offer first before messaging.' }, { status: 422 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertErr } = await (supabaseAdmin.from('auction_offer_messages') as any)
        .insert({
            auction_id,
            buyer_id: buyerId,
            seller_id: auction.seller_id,
            sender_id: user.id,
            body: text,
        })
        .select('id, auction_id, buyer_id, seller_id, sender_id, body, created_at')
        .single();

    if (insertErr || !inserted)
        return NextResponse.json({ error: insertErr?.message ?? 'Failed to send message' }, { status: 500 });

    const recipientId = isSeller ? buyerId : auction.seller_id;
    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: recipientId,
        type: 'new_message',
        title: isSeller ? 'Message from Seller' : 'Message from Buyer',
        body: text.length > 100 ? `${text.slice(0, 100)}…` : text,
        auction_id,
    });

    return NextResponse.json({ success: true, message: inserted }, { status: 201 });
}

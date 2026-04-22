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

// GET /api/offers?auction_id=<uuid>
// Buyers see only their own offers; sellers see all offers on their auction.
export async function GET(request: Request) {
    const user = await getAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const auctionId = new URL(request.url).searchParams.get('auction_id');
    if (!auctionId || !UUID_REGEX.test(auctionId))
        return NextResponse.json({ error: 'Valid auction_id required' }, { status: 400 });

    const { data: auction } = await supabaseAdmin
        .from('auctions').select('seller_id').eq('id', auctionId).maybeSingle();
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 });

    let query = supabaseAdmin
        .from('auction_offers')
        .select('id, auction_id, buyer_id, seller_id, amount, status, created_at')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: true });

    if (auction.seller_id !== user.id) query = query.eq('buyer_id', user.id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    return NextResponse.json({ offers: data ?? [] });
}

// POST /api/offers
// Body: { auction_id: string; amount: number }
export async function POST(request: Request) {
    const user = await getAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { auction_id?: string; amount?: number };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { auction_id, amount } = body;
    if (!auction_id || !UUID_REGEX.test(auction_id))
        return NextResponse.json({ error: 'Valid auction_id required' }, { status: 400 });
    if (!amount || typeof amount !== 'number' || amount <= 0)
        return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });

    const { data: auction } = await supabaseAdmin
        .from('auctions').select('id, title, seller_id, status').eq('id', auction_id).maybeSingle();
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    if (auction.status !== 'active')
        return NextResponse.json({ error: 'Auction is no longer active' }, { status: 422 });
    if (auction.seller_id === user.id)
        return NextResponse.json({ error: 'Cannot offer on your own auction' }, { status: 422 });

    const { data: offer, error: insertErr } = await supabaseAdmin
        .from('auction_offers')
        .insert({ auction_id, buyer_id: user.id, seller_id: auction.seller_id, amount })
        .select('id').single();

    if (insertErr || !offer)
        return NextResponse.json({ error: insertErr?.message ?? 'Failed to create offer' }, { status: 500 });

    const { data: bp } = await supabaseAdmin
        .from('profiles').select('full_name, username').eq('id', user.id).maybeSingle();
    const buyerLabel =
        (bp as { full_name?: string | null; username?: string | null } | null)?.full_name?.trim() ||
        (bp as { full_name?: string | null; username?: string | null } | null)?.username?.trim() ||
        'A buyer';

    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: auction.seller_id,
        type: 'new_offer',
        title: 'New Offer on Your Listing',
        body: `${buyerLabel} offered GHS ${Number(amount).toLocaleString()} for "${auction.title}"`,
        auction_id,
    });

    return NextResponse.json({ success: true, offer_id: offer.id }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BID_AMOUNT = 999_999;

/** 30 bids per 60-second window per authenticated user */
const BIDS_LIMIT = 30;
const BIDS_WINDOW_MS = 60_000;

/**
 * POST /api/bids
 * Body: { auction_id: string; amount: number }
 */
export async function POST(request: Request) {
    const supabase = await createClient();

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate-limit per authenticated user
    const rl = rateLimit(`bids:${user.id}`, BIDS_LIMIT, BIDS_WINDOW_MS);
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Too many bids. Please slow down.' },
            { status: 429, headers: rateLimitHeaders(rl) }
        );
    }

    let body: { auction_id?: string; amount?: number };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { auction_id, amount } = body;

    if (!auction_id || typeof auction_id !== 'string' || !UUID_REGEX.test(auction_id)) {
        return NextResponse.json({ error: 'A valid auction_id (UUID) is required' }, { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (amount > MAX_BID_AMOUNT) {
        return NextResponse.json({ error: `amount cannot exceed ${MAX_BID_AMOUNT}` }, { status: 400 });
    }

    // Call the atomic place_bid function
    const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auction_id,
        p_bidder_id: user.id,
        p_amount: amount,
    } as any);

    if (error) {
        console.error('[bid-api]', error.message);
        return NextResponse.json({ error: 'Failed to place bid. Please try again.' }, { status: 500 });
    }

    const result = data as {
        success?: boolean;
        error?: string;
        bid_id?: string;
        new_price?: number;
        outbid_user?: { user_id: string; email: string; name: string; auction_title: string }
    };

    if (result.error) {
        // Business-rule rejection (e.g. bid too low, auction ended)
        return NextResponse.json({ error: result.error }, { status: 422 });
    }

    const admin = createAdminClient();
    const { data: auctionRecord } = await admin
        .from('auctions')
        .select('seller_id, title')
        .eq('id', auction_id)
        .maybeSingle();

    const auction = auctionRecord as { seller_id: string; title: string } | null;

    if (auction?.seller_id && auction.seller_id !== user.id) {
        await insertNotificationIfEnabled(admin, {
            user_id: auction.seller_id,
            type: 'new_bid',
            title: 'New bid on your listing',
            body: `A new bid of GHS ${amount.toLocaleString()} was placed on "${auction.title}".`,
            auction_id,
        });
    }

    // Fire off the "Outbid" email notification in the background
    if (result.outbid_user && result.outbid_user.email) {
        // Dynamic import to avoid edge runtime issues if needed, but since it's standard Next API it's fine.
        import('@/lib/email/sender').then(({ sendOutbidEmail }) => {
            sendOutbidEmail(
                result.outbid_user!.email,
                result.outbid_user!.name,
                result.outbid_user!.auction_title,
                amount,
                auction_id
            ).catch(err => console.error("Failed to send outbid email async", err));
        });
    }

    return NextResponse.json(
        { success: true, bid_id: result.bid_id, new_price: result.new_price },
        { status: 201 }
    );
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BID_AMOUNT = 999_999;

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

    const result = data as { success?: boolean; error?: string; bid_id?: string; new_price?: number };

    if (result.error) {
        // Business-rule rejection (e.g. bid too low, auction ended)
        return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(
        { success: true, bid_id: result.bid_id, new_price: result.new_price },
        { status: 201 }
    );
}

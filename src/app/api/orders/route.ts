import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/orders
 * Retired: checkout no longer exists. Deals are arranged directly between
 * buyer and seller (offers, Deal & Chat, WhatsApp). No new orders are
 * created; existing orders stay readable as history on the orders pages.
 */
export async function POST(req: NextRequest) {
    void req;
    return NextResponse.json(
        { error: 'Checkout is no longer available. Contact the seller from the listing to arrange the deal.' },
        { status: 410 }
    );
}

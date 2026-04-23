import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import {
    sendAuctionSoldEmail,
    sendAuctionWonEmail,
    sendOfferDeclinedEmail,
} from '@/lib/email/sender';

const supabaseAdmin = createAdminClient();

function getDisplayName(
    profile: { full_name?: string | null; username?: string | null } | null,
    fallback: string
) {
    return profile?.full_name || profile?.username || fallback;
}

export async function POST(request: NextRequest) {
    // Bearer token auth for mobile clients
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { offer_id?: string; response?: string };
    const { offer_id: offerId, response } = body;

    if (!offerId || (response !== 'accepted' && response !== 'declined')) {
        return NextResponse.json({ error: 'offer_id and response (accepted|declined) are required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: offer, error: fetchErr } = await (supabaseAdmin as any)
        .from('auction_offers')
        .select('id, auction_id, buyer_id, seller_id, amount, status')
        .eq('id', offerId)
        .single() as { data: { id: string; auction_id: string; buyer_id: string; seller_id: string; amount: number; status: string } | null; error: unknown };

    if (fetchErr || !offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    if (offer.seller_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (offer.status !== 'pending') return NextResponse.json({ error: 'This offer is no longer pending' }, { status: 409 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
        .from('auction_offers')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', offerId);

    if (response === 'accepted') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: auction } = await (supabaseAdmin as any)
            .from('auctions')
            .select('title, status')
            .eq('id', offer.auction_id)
            .single() as { data: { title: string; status: string } | null };

        if (!auction || auction.status !== 'active') {
            return NextResponse.json({ error: 'Auction is no longer active' }, { status: 409 });
        }

        const now = new Date().toISOString();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateErr } = await (supabaseAdmin as any)
            .from('auctions')
            .update({ status: 'sold', winner_id: offer.buyer_id, current_price: offer.amount, ends_at: now, updated_at: now })
            .eq('id', offer.auction_id)
            .eq('status', 'active') as { error: unknown };

        if (updateErr) return NextResponse.json({ error: 'Failed to finalise auction' }, { status: 500 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any)
            .from('auction_offers')
            .update({ status: 'declined', updated_at: now })
            .eq('auction_id', offer.auction_id)
            .eq('status', 'pending')
            .neq('id', offerId);

        await insertNotificationIfEnabled(supabaseAdmin as never, {
            user_id: offer.buyer_id,
            type: 'auction_won',
            title: 'Your Offer Was Accepted!',
            body: `The seller accepted your offer of GHS ${Number(offer.amount).toLocaleString()} for "${auction.title}". You have 30 minutes to complete your order.`,
            auction_id: offer.auction_id,
        });

        await insertNotificationIfEnabled(supabaseAdmin as never, {
            user_id: user.id,
            type: 'new_offer',
            title: 'Offer Accepted - Awaiting Buyer',
            body: `You accepted GHS ${Number(offer.amount).toLocaleString()} for "${auction.title}". The listing stays active until the order is completed.`,
            auction_id: offer.auction_id,
        });

        const [sellerProfileRes, buyerProfileRes, sellerAuthResult, buyerAuthResult] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabaseAdmin as any).from('profiles').select('full_name, username').eq('id', offer.seller_id).maybeSingle() as Promise<{ data: { full_name: string | null; username: string | null } | null }>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabaseAdmin as any).from('profiles').select('full_name, username').eq('id', offer.buyer_id).maybeSingle() as Promise<{ data: { full_name: string | null; username: string | null } | null }>,
            supabaseAdmin.auth.admin.getUserById(offer.seller_id),
            supabaseAdmin.auth.admin.getUserById(offer.buyer_id),
        ]);

        const sellerName = getDisplayName(sellerProfileRes.data, 'Seller');
        const buyerName = getDisplayName(buyerProfileRes.data, 'Buyer');

        if (buyerAuthResult.data.user?.email) {
            await sendAuctionWonEmail(buyerAuthResult.data.user.email, buyerName, auction.title, Number(offer.amount), offer.auction_id);
        }
        if (sellerAuthResult.data.user?.email) {
            await sendAuctionSoldEmail(sellerAuthResult.data.user.email, sellerName, auction.title, Number(offer.amount), buyerName);
        }
    } else {
        const [auctionRes, buyerProfileRes2, buyerAuthResult] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabaseAdmin as any).from('auctions').select('title').eq('id', offer.auction_id).single() as Promise<{ data: { title: string } | null }>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabaseAdmin as any).from('profiles').select('full_name, username').eq('id', offer.buyer_id).maybeSingle() as Promise<{ data: { full_name: string | null; username: string | null } | null }>,
            supabaseAdmin.auth.admin.getUserById(offer.buyer_id),
        ]);
        const auction = auctionRes.data;

        await insertNotificationIfEnabled(supabaseAdmin as never, {
            user_id: offer.buyer_id,
            type: 'system',
            title: 'Offer Declined',
            body: `The seller declined your offer of GHS ${Number(offer.amount).toLocaleString()} for "${auction?.title ?? 'this item'}".`,
            auction_id: offer.auction_id,
        });

        if (buyerAuthResult.data.user?.email) {
            const buyerName = getDisplayName(buyerProfileRes2.data, 'Buyer');
            await sendOfferDeclinedEmail(buyerAuthResult.data.user.email, buyerName, auction?.title ?? 'this item', Number(offer.amount), offer.auction_id);
        }
    }

    return NextResponse.json({ success: true });
}

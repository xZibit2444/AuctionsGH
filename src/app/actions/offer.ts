'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import {
    sendAuctionSoldEmail,
    sendAuctionWonEmail,
    sendOfferDeclinedEmail,
    sendOfferReceivedEmail,
} from '@/lib/email/sender';

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getDisplayName(profile: { full_name?: string | null; username?: string | null } | null, fallback: string) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

export async function makeOfferAction(
    auctionId: string,
    amount: number
): Promise<{ success: boolean; error?: string; offerId?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!amount || amount <= 0) return { success: false, error: 'Invalid amount' };

    const { data: auction, error: auctionErr } = await supabaseAdmin
        .from('auctions')
        .select('id, title, seller_id, status')
        .eq('id', auctionId)
        .single();

    if (auctionErr || !auction) return { success: false, error: 'Auction not found' };
    if (auction.status !== 'active') return { success: false, error: 'Auction is no longer active' };
    if (auction.seller_id === user.id) return { success: false, error: 'You cannot make an offer on your own auction' };

    await supabaseAdmin
        .from('auction_offers')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('auction_id', auctionId)
        .eq('buyer_id', user.id)
        .eq('status', 'pending');

    const { data: offer, error: insertErr } = await supabaseAdmin
        .from('auction_offers')
        .insert({
            auction_id: auctionId,
            buyer_id: user.id,
            seller_id: auction.seller_id,
            amount,
        })
        .select('id')
        .single();

    if (insertErr || !offer) return { success: false, error: 'Failed to send offer. Please try again.' };

    const { data: buyerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

    const buyerLabel = getDisplayName(
        buyerProfile as { full_name?: string | null; username?: string | null } | null,
        'A buyer'
    );

    await insertNotificationIfEnabled(supabaseAdmin as never, {
        user_id: auction.seller_id,
        type: 'new_offer',
        title: 'New Offer on Your Listing',
        body: `${buyerLabel} is asking: "Will you accept GHS ${Number(amount).toLocaleString()} for ${auction.title}?"`,
        auction_id: auctionId,
    });

    const [{ data: sellerProfile }, sellerAuthResult] = await Promise.all([
        supabaseAdmin
            .from('profiles')
            .select('full_name, username')
            .eq('id', auction.seller_id)
            .maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(auction.seller_id),
    ]);

    if (sellerAuthResult.data.user?.email) {
        const sellerName = getDisplayName(
            sellerProfile as { full_name?: string | null; username?: string | null } | null,
            'Seller'
        );

        const offerReceivedEmailResult = await sendOfferReceivedEmail(
            sellerAuthResult.data.user.email,
            sellerName,
            buyerLabel,
            auction.title,
            Number(amount),
            auctionId
        );

        if (!offerReceivedEmailResult.success) {
            console.error('Failed to send new offer email:', offerReceivedEmailResult.error);
        }
    }

    return { success: true, offerId: offer.id };
}

export async function respondToOfferAction(
    offerId: string,
    response: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: offer, error: fetchErr } = await supabaseAdmin
        .from('auction_offers')
        .select('id, auction_id, buyer_id, seller_id, amount, status')
        .eq('id', offerId)
        .single();

    if (fetchErr || !offer) return { success: false, error: 'Offer not found' };
    if (offer.seller_id !== user.id) return { success: false, error: 'Unauthorized' };
    if (offer.status !== 'pending') return { success: false, error: 'This offer is no longer pending' };

    await supabaseAdmin
        .from('auction_offers')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', offerId);

    if (response === 'accepted') {
        const { data: auction } = await supabaseAdmin
            .from('auctions')
            .select('title, status')
            .eq('id', offer.auction_id)
            .single();

        if (!auction || auction.status !== 'active') {
            return { success: false, error: 'Auction is no longer active - cannot accept offer' };
        }

        const now = new Date().toISOString();
        const { error: updateErr } = await supabaseAdmin
            .from('auctions')
            .update({
                status: 'sold',
                winner_id: offer.buyer_id,
                current_price: offer.amount,
                ends_at: now,
                updated_at: now,
            })
            .eq('id', offer.auction_id)
            .eq('status', 'active');

        if (updateErr) return { success: false, error: 'Failed to finalise auction' };

        await supabaseAdmin
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

        const [{ data: sellerProfile }, { data: buyerProfile }, sellerAuthResult, buyerAuthResult] = await Promise.all([
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', offer.seller_id).maybeSingle(),
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', offer.buyer_id).maybeSingle(),
            supabaseAdmin.auth.admin.getUserById(offer.seller_id),
            supabaseAdmin.auth.admin.getUserById(offer.buyer_id),
        ]);

        const sellerName = getDisplayName(
            sellerProfile as { full_name?: string | null; username?: string | null } | null,
            'Seller'
        );
        const buyerName = getDisplayName(
            buyerProfile as { full_name?: string | null; username?: string | null } | null,
            'Buyer'
        );

        if (buyerAuthResult.data.user?.email) {
            const buyerEmailResult = await sendAuctionWonEmail(
                buyerAuthResult.data.user.email,
                buyerName,
                auction.title,
                Number(offer.amount),
                offer.auction_id
            );

            if (!buyerEmailResult.success) {
                console.error('Failed to send accepted-offer winner email:', buyerEmailResult.error);
            }
        }

        if (sellerAuthResult.data.user?.email) {
            const sellerEmailResult = await sendAuctionSoldEmail(
                sellerAuthResult.data.user.email,
                sellerName,
                auction.title,
                Number(offer.amount),
                buyerName
            );

            if (!sellerEmailResult.success) {
                console.error('Failed to send accepted-offer sold email:', sellerEmailResult.error);
            }
        }
    } else {
        const [{ data: auction }, { data: buyerProfile }, buyerAuthResult] = await Promise.all([
            supabaseAdmin.from('auctions').select('title').eq('id', offer.auction_id).single(),
            supabaseAdmin.from('profiles').select('full_name, username').eq('id', offer.buyer_id).maybeSingle(),
            supabaseAdmin.auth.admin.getUserById(offer.buyer_id),
        ]);

        await insertNotificationIfEnabled(supabaseAdmin as never, {
            user_id: offer.buyer_id,
            type: 'system',
            title: 'Offer Declined',
            body: `The seller declined your offer of GHS ${Number(offer.amount).toLocaleString()} for "${auction?.title ?? 'this item'}".`,
            auction_id: offer.auction_id,
        });

        if (buyerAuthResult.data.user?.email) {
            const buyerName = getDisplayName(
                buyerProfile as { full_name?: string | null; username?: string | null } | null,
                'Buyer'
            );
            const declinedEmailResult = await sendOfferDeclinedEmail(
                buyerAuthResult.data.user.email,
                buyerName,
                auction?.title ?? 'this item',
                Number(offer.amount),
                offer.auction_id
            );

            if (!declinedEmailResult.success) {
                console.error('Failed to send offer declined email:', declinedEmailResult.error);
            }
        }
    }

    return { success: true };
}

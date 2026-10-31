import { createAdminClient } from '@/lib/supabase/admin';
import { insertNotificationIfEnabled } from '@/lib/notifications';

type OpenOffer = { id: string; buyer_id: string; status: string };

/**
 * Mark a listing sold when one of its orders is completed.
 *
 * Permanent listings stay active and visible while offers are made and
 * accepted - an offer does not reserve the item and buyers can fail to pay.
 * Only a completed order takes the listing off the market. This helper is a
 * no-op for listings that are already sold (timed auctions and Buy-now
 * purchases are marked sold at claim time), so it is safe to call from every
 * order-completion path.
 */
export async function finalizeListingSaleIfActive(auctionId: string, buyerId: string): Promise<void> {
    const supabaseAdmin = createAdminClient();
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: claimed, error } = await (supabaseAdmin as any)
        .from('auctions')
        .update({ status: 'sold', winner_id: buyerId, ends_at: now, updated_at: now })
        .eq('id', auctionId)
        .eq('status', 'active')
        .select('id, title') as { data: { id: string; title: string }[] | null; error: unknown };

    if (error || !claimed || claimed.length === 0) return; // already sold/ended elsewhere

    // The listing stayed on the market until this moment, so other buyers may
    // hold pending or accepted offers on it. Close them all out; buyers whose
    // offer had been accepted are told explicitly that the item sold elsewhere.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: openOffers } = await (supabaseAdmin as any)
        .from('auction_offers')
        .select('id, buyer_id, status')
        .eq('auction_id', auctionId)
        .in('status', ['pending', 'accepted', 'countered'])
        .neq('buyer_id', buyerId) as { data: OpenOffer[] | null };

    if (!openOffers || openOffers.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
        .from('auction_offers')
        .update({ status: 'declined', updated_at: now })
        .in('id', openOffers.map((o) => o.id));

    const title = claimed[0].title;
    await Promise.all(
        openOffers
            .filter((o) => o.status === 'accepted')
            .map((o) =>
                insertNotificationIfEnabled(supabaseAdmin as never, {
                    user_id: o.buyer_id,
                    type: 'system',
                    title: 'Item Sold to Another Buyer',
                    body: `"${title}" was sold to another buyer. Your accepted offer no longer applies.`,
                    auction_id: auctionId,
                })
            )
    );
}

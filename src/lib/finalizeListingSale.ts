import { createAdminClient } from '@/lib/supabase/admin';
import { insertNotificationIfEnabled } from '@/lib/notifications';
import { isPermanentListing } from '@/lib/listings';

type OpenOffer = { id: string; buyer_id: string; status: string };

/**
 * Close out a listing when one of its orders is completed.
 *
 * Permanent listings are never taken down automatically - not by an accepted
 * offer, not by a Buy-now click, and not by a completed order. Only the
 * seller takes a listing down (pause, mark sold, delete), so for a permanent
 * listing this helper is a no-op: it stays live and its other offers stay
 * open for the seller to manage.
 *
 * Timed auctions are already marked sold at claim time, so the conditional
 * update below only fires for legacy non-permanent listings that are somehow
 * still active when an order completes.
 */
export async function finalizeListingSaleIfActive(auctionId: string, buyerId: string): Promise<void> {
    const supabaseAdmin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing } = await (supabaseAdmin as any)
        .from('auctions')
        .select('id, status, ends_at')
        .eq('id', auctionId)
        .maybeSingle() as { data: { id: string; status: string; ends_at: string | null } | null };

    if (!listing || listing.status !== 'active') return; // already sold/ended elsewhere
    if (isPermanentListing(listing.ends_at)) return; // seller-controlled takedown only

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

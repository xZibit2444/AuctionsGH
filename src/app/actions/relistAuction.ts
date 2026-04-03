'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPermanentListing } from '@/lib/listings';
import type { Auction, AuctionImage } from '@/types/auction';
import type { Profile } from '@/types/profile';

const supabaseAdmin = createAdminClient();
const PERMANENT_RELIST_ENDS_AT = '2099-12-31T23:59:59.000Z';
const DEFAULT_AUCTION_DURATION_MS = 72 * 60 * 60 * 1000;
const MAX_RELIST_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

type OrderStatusRow = {
    status: string;
    deliveries?: { status: string }[] | { status: string } | null;
};

function getPrimaryDeliveryStatus(order: OrderStatusRow | null) {
    if (!order?.deliveries) return null;
    return Array.isArray(order.deliveries) ? order.deliveries[0]?.status ?? null : order.deliveries.status;
}

function isCompletedDeal(order: OrderStatusRow | null) {
    const deliveryStatus = getPrimaryDeliveryStatus(order);
    return order?.status === 'completed'
        || order?.status === 'pin_verified'
        || deliveryStatus === 'completed'
        || deliveryStatus === 'delivered';
}

function getRelistEndsAt(auction: Pick<Auction, 'starts_at' | 'ends_at' | 'bid_count' | 'status'>) {
    if (isPermanentListing(auction.ends_at) || (auction.status === 'sold' && auction.bid_count === 0)) {
        return PERMANENT_RELIST_ENDS_AT;
    }

    const originalDuration = new Date(auction.ends_at).getTime() - new Date(auction.starts_at).getTime();
    const durationMs = originalDuration > 0 && originalDuration <= MAX_RELIST_DURATION_MS
        ? originalDuration
        : DEFAULT_AUCTION_DURATION_MS;

    return new Date(Date.now() + durationMs).toISOString();
}

export async function relistAuctionAction(
    auctionId: string
): Promise<{ success: boolean; error?: string; auctionId?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle() as {
            data: Pick<Profile, 'is_super_admin'> | null;
            error: unknown;
        };

    const isSuperAdmin = callerProfile?.is_super_admin === true;

    const { data: auction } = await supabaseAdmin
        .from('auctions')
        .select(`
            id,
            seller_id,
            title,
            description,
            brand,
            model,
            storage_gb,
            ram_gb,
            condition,
            listing_city,
            meetup_area,
            delivery_available,
            inspection_available,
            starting_price,
            current_price,
            min_increment,
            bid_count,
            status,
            winner_id,
            starts_at,
            ends_at,
            auction_images(id, url, position, created_at)
        `)
        .eq('id', auctionId)
        .single() as {
            data: (Pick<Auction, 'id' | 'seller_id' | 'title' | 'description' | 'brand' | 'model' | 'storage_gb' | 'ram_gb' | 'condition' | 'listing_city' | 'meetup_area' | 'delivery_available' | 'inspection_available' | 'starting_price' | 'current_price' | 'min_increment' | 'bid_count' | 'status' | 'winner_id' | 'starts_at' | 'ends_at'> & {
                auction_images?: AuctionImage[] | null;
            }) | null;
            error: unknown;
        };

    if (!auction) return { success: false, error: 'Listing not found' };

    const isOwner = auction.seller_id === user.id;
    if (!isOwner && !isSuperAdmin) {
        return { success: false, error: 'Not allowed to relist this listing' };
    }

    if (auction.status === 'active') {
        return { success: false, error: 'This listing is already active' };
    }

    const { data: latestOrder } = await supabaseAdmin
        .from('orders')
        .select('status, deliveries(status)')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as {
            data: OrderStatusRow | null;
            error: unknown;
        };

    const { data: acceptedOffer } = await supabaseAdmin
        .from('auction_offers')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

    const completedDeal = isCompletedDeal(latestOrder);

    if (auction.status === 'sold' && !completedDeal) {
        return { success: false, error: 'This listing still has an active order. Relisting is only available after the order is completed.' };
    }

    if (acceptedOffer && !completedDeal) {
        return { success: false, error: 'This listing still has an active accepted offer.' };
    }

    const endsAt = getRelistEndsAt(auction);

    const { data: relistedAuction, error: insertError } = await (supabaseAdmin.from('auctions') as any)
        .insert({
            seller_id: auction.seller_id,
            title: auction.title,
            description: auction.description,
            brand: auction.brand,
            model: auction.model,
            storage_gb: auction.storage_gb,
            ram_gb: auction.ram_gb,
            condition: auction.condition,
            listing_city: auction.listing_city,
            meetup_area: auction.meetup_area,
            delivery_available: auction.delivery_available,
            inspection_available: auction.inspection_available,
            starting_price: auction.starting_price,
            current_price: auction.starting_price,
            min_increment: auction.min_increment,
            bid_count: 0,
            status: 'active',
            winner_id: null,
            starts_at: new Date().toISOString(),
            ends_at: endsAt,
        })
        .select('id')
        .single();

    if (insertError || !relistedAuction) {
        return { success: false, error: insertError?.message ?? 'Failed to relist item' };
    }

    const nextAuctionId = (relistedAuction as { id: string }).id;

    const imageRows = [...(auction.auction_images ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((image) => ({
            auction_id: nextAuctionId,
            url: image.url,
            position: image.position,
        }));

    if (imageRows.length > 0) {
        const { error: imageError } = await (supabaseAdmin.from('auction_images') as any).insert(imageRows);
        if (imageError) {
            await supabaseAdmin.from('auctions').delete().eq('id', nextAuctionId);
            return { success: false, error: imageError.message };
        }
    }

    const { data: winnerNoteRow } = await supabaseAdmin
        .from('auction_winner_notes')
        .select('note')
        .eq('auction_id', auctionId)
        .maybeSingle() as {
            data: { note: string } | null;
            error: unknown;
        };

    if (winnerNoteRow?.note) {
        await (supabaseAdmin.from('auction_winner_notes') as any).insert({
            auction_id: nextAuctionId,
            seller_id: auction.seller_id,
            note: winnerNoteRow.note,
        });
    }

    return { success: true, auctionId: nextAuctionId };
}

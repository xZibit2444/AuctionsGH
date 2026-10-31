'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient as _createAdminClient } from '@/lib/supabase/admin';
import { isPermanentListing } from '@/lib/listings';
import { isTerminalOrderStatus } from '@/lib/orderStatus';
import { updateListingSchema, type UpdateListingInput } from '@/lib/listingEdit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAdminClient = () => _createAdminClient() as any;

type ListingRow = {
    id: string;
    seller_id: string;
    status: string;
    bid_count: number | null;
    ends_at: string | null;
    title: string;
    condition: string | null;
    starting_price: number | null;
};

async function getOwnedListing(auctionId: string) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' as const };

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('is_banned, is_super_admin')
        .eq('id', user.id)
        .maybeSingle() as { data: { is_banned?: boolean; is_super_admin?: boolean } | null };
    if (profile?.is_banned) return { error: 'Your account cannot edit listings' as const };

    const { data: listing } = await admin
        .from('auctions')
        .select('id, seller_id, status, bid_count, ends_at, title, condition, starting_price')
        .eq('id', auctionId)
        .maybeSingle() as { data: ListingRow | null };
    if (!listing) return { error: 'Listing not found' as const };
    if (listing.seller_id !== user.id && !profile?.is_super_admin) {
        return { error: 'You can only edit your own listings' as const };
    }
    return { admin, listing, user };
}

async function hasAcceptedOffer(admin: ReturnType<typeof createAdminClient>, auctionId: string) {
    const { data } = await admin
        .from('auction_offers')
        .select('id, amount')
        .eq('auction_id', auctionId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();
    return data ? { amount: Number(data.amount) } : null;
}

async function getOpenOrder(admin: ReturnType<typeof createAdminClient>, auctionId: string) {
    const { data } = await admin
        .from('orders')
        .select('id, status, amount')
        .eq('auction_id', auctionId)
        .maybeSingle();
    if (!data || isTerminalOrderStatus(data.status)) return null;
    return { amount: Number(data.amount) };
}

// A deal is in progress when an offer was accepted or an order is still open.
// While it is, the fields that make up the buyer's agreed order (title,
// condition, price) are locked so edits can't silently change that deal.
// Everything else on the listing stays editable.
async function getDealInProgress(admin: ReturnType<typeof createAdminClient>, auctionId: string) {
    const [offer, order] = await Promise.all([
        hasAcceptedOffer(admin, auctionId),
        getOpenOrder(admin, auctionId),
    ]);
    if (!offer && !order) return null;
    return { agreedPrice: (order ?? offer)!.amount };
}

export async function getListingDealState(
    auctionId: string
): Promise<{ dealPending: boolean; agreedPrice: number | null }> {
    const ctx = await getOwnedListing(auctionId);
    if ('error' in ctx) return { dealPending: false, agreedPrice: null };
    const deal = await getDealInProgress(ctx.admin, auctionId);
    return { dealPending: Boolean(deal), agreedPrice: deal?.agreedPrice ?? null };
}

export async function updateListingAction(
    auctionId: string,
    input: UpdateListingInput
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string> }> {
    const parsed = updateListingSchema.safeParse(input);
    if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
            const key = String(issue.path[0] ?? 'form');
            if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        return { success: false, error: 'Please fix the highlighted fields', fieldErrors };
    }

    const ctx = await getOwnedListing(auctionId);
    if ('error' in ctx) return { success: false, error: ctx.error };
    const { admin, listing } = ctx;

    if (listing.status === 'sold') {
        return { success: false, error: 'This listing has been sold and can no longer be edited.' };
    }

    const deal = await getDealInProgress(admin, auctionId);

    const d = parsed.data;
    const update: Record<string, unknown> = {
        title: d.title,
        description: d.description?.trim() ? d.description.trim() : null,
        brand: d.brand,
        model: d.model ?? '',
        storage_gb: d.storage_gb || null,
        condition: d.condition,
        battery_health: d.battery_health ?? null,
        sim_type: d.sim_type ?? null,
        network_lock: d.network_lock ?? null,
        faults: d.faults?.trim() ? d.faults.trim() : null,
        listing_city: d.listing_city,
        meetup_area: d.meetup_area,
        delivery_available: d.delivery_available,
        inspection_available: d.inspection_available,
        updated_at: new Date().toISOString(),
    };

    if (deal) {
        const locked: string[] = [];
        if (d.title.trim() !== (listing.title ?? '')) locked.push('title');
        if (d.condition !== (listing.condition ?? '')) locked.push('condition');
        if (d.price !== undefined && Number(d.price) !== Number(listing.starting_price)) locked.push('price');
        if (locked.length > 0) {
            return {
                success: false,
                error: `The ${locked.join(', ')} ${locked.length === 1 ? 'is' : 'are'} locked while a deal is in progress on this listing. The buyer already agreed to them; they unlock if the deal falls through.`,
            };
        }
    }

    if (d.price !== undefined && !deal) {
        const bids = listing.bid_count ?? 0;
        if (bids > 0 && !isPermanentListing(listing.ends_at)) {
            return { success: false, error: 'The price cannot change after bids have been placed.' };
        }
        update.starting_price = d.price;
        update.current_price = d.price;
    }

    const { error } = await admin.from('auctions').update(update).eq('id', auctionId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/auctions/${auctionId}`);
    revalidatePath('/listings');
    revalidatePath('/auctions');
    return { success: true };
}

export type ListingStatusChange = 'pause' | 'resume' | 'sold_elsewhere';

export async function setListingStatusAction(
    auctionId: string,
    change: ListingStatusChange
): Promise<{ success: boolean; error?: string }> {
    const ctx = await getOwnedListing(auctionId);
    if ('error' in ctx) return { success: false, error: ctx.error };
    const { admin, listing } = ctx;

    if (!isPermanentListing(listing.ends_at)) {
        return { success: false, error: 'Pause and mark as sold are only for permanent listings.' };
    }
    if ((listing.bid_count ?? 0) > 0) {
        return { success: false, error: 'This listing has bids and cannot be changed this way.' };
    }
    if (await hasAcceptedOffer(admin, auctionId)) {
        return { success: false, error: 'An offer was accepted on this listing.' };
    }

    let nextStatus: 'draft' | 'active' | 'ended';
    if (change === 'pause') {
        if (listing.status !== 'active') return { success: false, error: 'Only live listings can be paused.' };
        nextStatus = 'draft';
    } else if (change === 'resume') {
        // 'draft' = paused by seller; 'ended' = marked sold elsewhere. 'cancelled' is an admin takedown and stays admin-only.
        if (listing.status !== 'draft' && listing.status !== 'ended') {
            return { success: false, error: 'This listing cannot be resumed.' };
        }
        nextStatus = 'active';
    } else {
        if (listing.status !== 'active' && listing.status !== 'draft') {
            return { success: false, error: 'This listing cannot be marked as sold.' };
        }
        nextStatus = 'ended';
    }

    const { error } = await admin
        .from('auctions')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', auctionId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/auctions/${auctionId}`);
    revalidatePath('/listings');
    revalidatePath('/auctions');
    return { success: true };
}

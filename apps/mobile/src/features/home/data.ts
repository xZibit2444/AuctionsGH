// Mobile data layer — uses Supabase directly for reads, Next.js API routes for mutations.
// Set EXPO_PUBLIC_API_BASE_URL to your Next.js server URL (e.g. http://192.168.x.x:3000).

import { supabase } from '../../lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MobileProfile = {
    id: string;
    full_name: string | null;
    username: string | null;
    location: string | null;
    is_banned: boolean | null;
    is_admin: boolean | null;
};

export type MobileAuctionListItem = {
    id: string;
    title: string;
    brand: string | null;
    model: string | null;
    current_price: number;
    bid_count: number;
    status: string;
    ends_at: string;
    seller_id: string;
    auction_images: { url: string }[];
};

export type MobileAuctionDetail = MobileAuctionListItem & {
    description: string | null;
    condition: string | null;
    storage_gb: number | null;
    ram_gb: number | null;
    min_increment: number;
    profiles: {
        full_name: string | null;
        username: string | null;
        location: string | null;
    } | null;
};

export type MobileOffer = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
};

export type MobileOrder = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    fulfillment_type: 'meet_and_inspect' | 'escrow_delivery';
    status: string;
    amount: number;
    meetup_location: string | null;
    meetup_at: string | null;
    created_at: string;
    updated_at: string;
    auction: {
        id: string;
        title: string;
        brand: string | null;
        auction_images: { url: string; position: number }[];
    } | null;
    other_party: {
        full_name: string | null;
        username: string | null;
    } | null;
};

export type MobileOfferMessage = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    sender_id: string;
    body: string;
    created_at: string;
};

// ─── Supabase direct reads ───────────────────────────────────────────────────

export async function fetchMobileProfile(userId: string): Promise<MobileProfile | null> {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, location, is_banned, is_admin')
        .eq('id', userId)
        .maybeSingle();
    return data as MobileProfile | null;
}

export type AuctionFetchParams = {
    listingType?: 'timed' | 'permanent';
    search?: string;
    brand?: string;
    sort?: 'ends_at:asc' | 'created_at:desc' | 'current_price:asc' | 'current_price:desc';
    limit?: number;
};

export async function fetchActiveAuctions(params: AuctionFetchParams = {}): Promise<MobileAuctionListItem[]> {
    const { listingType, search, brand, sort = 'ends_at:asc', limit = 60 } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('auctions') as any)
        .select('id, title, brand, model, current_price, bid_count, status, ends_at, seller_id, auction_images(url)');

    if (listingType === 'permanent') {
        q = q.in('status', ['active', 'sold']).gt('ends_at', '2090-01-01');
    } else if (listingType === 'timed') {
        q = q.eq('status', 'active').lt('ends_at', '2090-01-01');
    } else {
        q = q.eq('status', 'active');
    }

    if (brand && brand !== 'All') q = q.eq('brand', brand);
    if (search) q = q.ilike('title', `%${search}%`);

    const [orderBy, dir] = sort.split(':');
    q = q.order(orderBy, { ascending: dir === 'asc' }).limit(limit);

    const { data } = await q;
    return (data ?? []) as unknown as MobileAuctionListItem[];
}

export async function fetchAuctionDetail(auctionId: string): Promise<MobileAuctionDetail | null> {
    const { data } = await supabase
        .from('auctions')
        .select(`
            id, title, brand, model, current_price, bid_count, status, ends_at, seller_id,
            description, condition, storage_gb, ram_gb, min_increment,
            auction_images(url),
            profiles!auctions_seller_id_fkey(full_name, username, location)
        `)
        .eq('id', auctionId)
        .maybeSingle();
    return data as unknown as MobileAuctionDetail | null;
}

export async function fetchMyOrders(userId: string): Promise<MobileOrder[]> {
    const { data } = await supabase
        .from('orders')
        .select(`
            id, auction_id, buyer_id, seller_id, fulfillment_type, status,
            amount, meetup_location, meetup_at, created_at, updated_at,
            auction:auctions(id, title, brand, auction_images(url, position))
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

    const rows = (data ?? []) as unknown as (MobileOrder & { buyer_id: string; seller_id: string })[];

    // Attach the other-party profile as a second query (can't self-join easily in one select)
    const otherIds = [...new Set(rows.map(r => r.buyer_id === userId ? r.seller_id : r.buyer_id))];
    let profileMap: Record<string, { full_name: string | null; username: string | null }> = {};
    if (otherIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .in('id', otherIds);
        (profiles ?? []).forEach((p: { id: string; full_name: string | null; username: string | null }) => {
            profileMap[p.id] = { full_name: p.full_name, username: p.username };
        });
    }

    return rows.map(r => ({
        ...r,
        other_party: profileMap[r.buyer_id === userId ? r.seller_id : r.buyer_id] ?? null,
    }));
}

export type MobileListing = {
    id: string;
    title: string;
    status: string;
    current_price: number;
    bid_count: number;
    ends_at: string;
    created_at: string;
    auction_images: { url: string }[];
};

export type MobileSellerStats = {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    totalRevenue: number;
};

export type MobileBuyerStats = {
    totalBids: number;
    wonAuctions: number;
    totalSpent: number;
    pendingOrders: number;
};

export async function fetchMyListings(userId: string): Promise<MobileListing[]> {
    const { data } = await supabase
        .from('auctions')
        .select('id, title, status, current_price, bid_count, ends_at, created_at, auction_images(url)')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    return (data ?? []) as unknown as MobileListing[];
}

export async function fetchSellerStats(userId: string): Promise<MobileSellerStats> {
    const { data } = await supabase
        .from('auctions')
        .select('status, current_price')
        .eq('seller_id', userId);
    const rows = (data ?? []) as { status: string; current_price: number }[];
    return {
        totalListings: rows.length,
        activeListings: rows.filter(r => r.status === 'active').length,
        soldListings: rows.filter(r => r.status === 'sold').length,
        totalRevenue: rows.filter(r => r.status === 'sold').reduce((s, r) => s + r.current_price, 0),
    };
}

export async function fetchBuyerStats(userId: string): Promise<MobileBuyerStats> {
    const [bidsRes, ordersRes] = await Promise.all([
        supabase.from('bids').select('id', { count: 'exact', head: true }).eq('bidder_id', userId),
        supabase.from('orders').select('id, status, amount').eq('buyer_id', userId),
    ]);
    const orders = (ordersRes.data ?? []) as { id: string; status: string; amount: number }[];
    return {
        totalBids: bidsRes.count ?? 0,
        wonAuctions: orders.length,
        totalSpent: orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0),
        pendingOrders: orders.filter(o => o.status === 'pending').length,
    };
}

export async function fetchWonAuctions(userId: string): Promise<MobileAuctionListItem[]> {
    const { data } = await supabase
        .from('auctions')
        .select('id, title, brand, model, current_price, bid_count, status, ends_at, seller_id, auction_images(url)')
        .eq('winner_id', userId)
        .eq('status', 'sold')
        .order('ends_at', { ascending: false })
        .limit(20);
    return (data ?? []) as unknown as MobileAuctionListItem[];
}

export async function deleteMyListing(auctionId: string, token: string) {
    return apiCall(`/api/listings/${auctionId}`, token, { method: 'DELETE' });
}

// Place a bid via Supabase RPC (SECURITY DEFINER function handles validation).
export async function placeMobileBid(auctionId: string, amount: number) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auctionId,
        p_bidder_id: userData.user.id,
        p_amount: amount,
    } as never);

    if (error) throw new Error(error.message);
    const result = data as { success?: boolean; error?: string } | null;
    if (result?.error) throw new Error(result.error);
    return result;
}

// ─── API route helpers (bearer token auth) ───────────────────────────────────

async function apiCall(path: string, token: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers ?? {}),
        },
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new Error((json.error as string) ?? 'Request failed');
    return json;
}

export async function fetchMobileOffers(auctionId: string, token: string): Promise<MobileOffer[]> {
    const json = await apiCall(`/api/offers?auction_id=${auctionId}`, token);
    return (json.offers ?? []) as MobileOffer[];
}

export async function placeMobileOffer(auctionId: string, amount: number, token: string) {
    return apiCall('/api/offers', token, {
        method: 'POST',
        body: JSON.stringify({ auction_id: auctionId, amount }),
    });
}

// Fetch messages for an offer thread.
// Sellers must pass buyerId to specify which buyer's thread.
export async function fetchOfferMessages(
    auctionId: string,
    token: string,
    buyerId?: string
): Promise<MobileOfferMessage[]> {
    const params = new URLSearchParams({ auction_id: auctionId });
    if (buyerId) params.set('buyer_id', buyerId);
    const json = await apiCall(`/api/offers/messages?${params.toString()}`, token);
    return (json.messages ?? []) as MobileOfferMessage[];
}

// Accept or decline a pending offer (seller only).
export async function respondToMobileOffer(
    offerId: string,
    response: 'accepted' | 'declined',
    token: string
): Promise<{ success: boolean }> {
    const json = await apiCall('/api/offers/respond', token, {
        method: 'POST',
        body: JSON.stringify({ offer_id: offerId, response }),
    });
    return json as { success: boolean };
}

// Send a message in an offer thread.
// Sellers must pass buyerId; buyers leave it undefined.
export async function sendOfferMessage(
    auctionId: string,
    text: string,
    token: string,
    buyerId?: string
): Promise<{ success: boolean; message: MobileOfferMessage }> {
    const body: Record<string, unknown> = { auction_id: auctionId, body: text };
    if (buyerId) body.buyer_id = buyerId;
    const json = await apiCall('/api/offers/messages', token, {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return json as { success: boolean; message: MobileOfferMessage };
}

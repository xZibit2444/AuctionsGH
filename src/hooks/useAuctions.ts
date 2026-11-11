'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getListingType, PERMANENT_LISTING_ENDS_AT_THRESHOLD } from '@/lib/listings';
import type { Auction } from '@/types/auction';
import type { AuctionStatus } from '@/types/database';

const SOLD_BROWSE_RETENTION_MS = 48 * 60 * 60 * 1000;

interface UseAuctionsOptions {
    initialAuctions?: Auction[];
    status?: AuctionStatus | 'all' | 'visible';
    listingType?: 'auction' | 'permanent' | 'all';
    brand?: string;
    sellerId?: string;
    search?: string;
    condition?: string;
    minStorage?: number;
    minPrice?: number;
    maxPrice?: number;
    deliveryAvailable?: boolean;
    limit?: number;
    orderBy?: 'created_at' | 'ends_at' | 'current_price';
    ascending?: boolean;
    /** Set true only when you need order + delivery status (e.g. seller ListingTable). Adds a JOIN overhead. */
    includeOrders?: boolean;
    /** Browse pages: fetch every matching row in 1k chunks instead of a hard cap. */
    fetchAll?: boolean;
}

export function useAuctions(options: UseAuctionsOptions = {}) {
    const {
        initialAuctions,
        status = 'active',
        listingType = 'all',
        brand,
        sellerId,
        search,
        condition,
        minStorage,
        minPrice,
        maxPrice,
        deliveryAvailable = false,
        limit = 40,
        orderBy = 'ends_at',
        ascending = true,
        includeOrders = false,
        fetchAll = false,
    } = options;

    const [auctions, setAuctions] = useState<Auction[]>(initialAuctions ?? []);
    const [loading, setLoading] = useState(!initialAuctions);
    const [error, setError] = useState<string | null>(null);

    // Debounce search to avoid firing a DB query on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (search === debouncedSearch) return;
        debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(debounceTimer.current);
    }, [search, debouncedSearch]);

    useEffect(() => {
        let isMounted = true;
        const fetchAuctions = async () => {
            if (!initialAuctions) setLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const selectCols = includeOrders
                    ? `
                        id,
                        title,
                        brand,
                        model,
                        condition,
                        current_price,
                        status,
                        bid_count,
                        ends_at,
                        created_at,
                        updated_at,
                        seller_id,
                        storage_gb,
                        listing_city,
                        meetup_area,
                        delivery_available,
                        is_pinned,
                        price_on_request,
                        profiles!auctions_seller_id_fkey(username, full_name, avatar_url, phone_number, whatsapp_enabled),
                        auction_images(url, position),
                        listing_videos(id),
                        orders(id, status, deliveries(status)),
                        auction_offers(status)
                    `
                    : `
                        id,
                        title,
                        brand,
                        model,
                        condition,
                        current_price,
                        status,
                        bid_count,
                        ends_at,
                        created_at,
                        updated_at,
                        seller_id,
                        storage_gb,
                        listing_city,
                        meetup_area,
                        delivery_available,
                        is_pinned,
                        price_on_request,
                        profiles!auctions_seller_id_fkey(username, full_name, avatar_url, phone_number, whatsapp_enabled),
                        auction_images(url, position),
                        listing_videos(id)
                    `;
                let query = supabase.from('auctions').select(selectCols);

                if (status === 'visible') {
                    query = query.in('status', ['active', 'sold']);
                } else if (status !== 'all') {
                    query = query.eq('status', status);
                }
                // Classify permanent vs auction (and, for 'visible', the 48h
                // sold-retention) in the DB rather than only client-side:
                // .limit() below runs before any client filter, so excluded
                // rows used to consume the window and hide valid listings
                // from the default All view. The client-side checks further
                // down stay as a backstop.
                if (status === 'visible') {
                    const soldCutoffIso = new Date(Date.now() - SOLD_BROWSE_RETENTION_MS).toISOString();
                    if (listingType === 'permanent') {
                        query = query.or(
                            `and(status.eq.active,or(ends_at.gte.${PERMANENT_LISTING_ENDS_AT_THRESHOLD},and(status.eq.sold,bid_count.eq.0))),and(status.eq.sold,updated_at.gte.${soldCutoffIso},or(ends_at.gte.${PERMANENT_LISTING_ENDS_AT_THRESHOLD},and(bid_count.eq.0)))`
                        );
                    } else if (listingType === 'auction') {
                        query = query.or(
                            `and(status.eq.active,ends_at.lt.${PERMANENT_LISTING_ENDS_AT_THRESHOLD}),and(status.eq.sold,updated_at.gte.${soldCutoffIso},ends_at.lt.${PERMANENT_LISTING_ENDS_AT_THRESHOLD},bid_count.gt.0)`
                        );
                    } else {
                        query = query.or(`status.eq.active,and(status.eq.sold,updated_at.gte.${soldCutoffIso})`);
                    }
                } else if (listingType === 'permanent') {
                    query = query.or(
                        `ends_at.gte.${PERMANENT_LISTING_ENDS_AT_THRESHOLD},and(status.eq.sold,bid_count.eq.0)`
                    );
                } else if (listingType === 'auction') {
                    query = query
                        .lt('ends_at', PERMANENT_LISTING_ENDS_AT_THRESHOLD)
                        .or('status.neq.sold,bid_count.gt.0');
                }
                if (brand && brand !== 'All') {
                    query = query.eq('brand', brand);
                }
                if (condition && condition !== 'All') {
                    query = query.eq('condition', condition);
                }
                if (minStorage && minStorage > 0) {
                    query = query.gte('storage_gb', minStorage);
                }
                if (minPrice != null && minPrice > 0) {
                    query = query.gte('current_price', minPrice);
                }
                if (maxPrice != null && maxPrice > 0) {
                    query = query.lte('current_price', maxPrice);
                }
                if (deliveryAvailable) {
                    query = query.eq('delivery_available', true);
                }
                if (sellerId) {
                    query = query.eq('seller_id', sellerId);
                }
                // Full-text search across title, brand and model
                if (debouncedSearch && debouncedSearch.trim()) {
                    const q = debouncedSearch.trim();
                    query = query.or(
                        `title.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`
                    );
                }

                // Apply ordering AFTER filters
                query = query.order(orderBy, { ascending });
                if (fetchAll) {
                    // Stable tie-breaker so range paging cannot skip or
                    // duplicate rows when many rows share the same ends_at.
                    query = query.order('id', { ascending: true });
                }

                let data: unknown[] | null = null;
                let fetchError: { message: string } | null = null;
                if (fetchAll) {
                    // No silent cap: page through every matching row.
                    const PAGE = 1000;
                    const allRows: unknown[] = [];
                    for (let fromIdx = 0; ; fromIdx += PAGE) {
                        const { data: pageRows, error: pageError } = await query.range(fromIdx, fromIdx + PAGE - 1);
                        if (pageError) {
                            fetchError = pageError;
                            break;
                        }
                        allRows.push(...((pageRows as unknown[]) ?? []));
                        if (!pageRows || pageRows.length < PAGE) break;
                    }
                    data = allRows;
                } else {
                    const { data: limitedRows, error: limitedError } = await query.limit(limit);
                    data = limitedRows;
                    fetchError = limitedError;
                }

                if (!isMounted) return;

                if (fetchError) {
                    setError(fetchError.message);
                } else {
                    const nextAuctions = (data as Auction[]).filter((auction) => {
                        if (listingType !== 'all' && getListingType(auction) !== listingType) {
                            return false;
                        }

                        if (status !== 'visible' || auction.status !== 'sold') return true;

                        const soldAt = new Date(auction.updated_at).getTime();
                        return Date.now() - soldAt <= SOLD_BROWSE_RETENTION_MS;
                    });

                    setAuctions(fetchAll ? nextAuctions : nextAuctions.slice(0, limit));
                }
            } catch (err) {
                if (!isMounted) return;
                setError(err instanceof Error ? err.message : 'Failed to load auctions');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAuctions();

        // Reuse the singleton client for the realtime subscription
        const supabase = createClient();

        // Listen for live updates to auctions (e.g. price increase, sold)
        const channel = supabase
            .channel('public:auctions_list')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'auctions',
                },
                (payload) => {
                    setAuctions((currentAuctions) =>
                        currentAuctions.map((auction) => {
                            if (auction.id === payload.new.id) {
                                return {
                                    ...auction,
                                    current_price: payload.new.current_price,
                                    status: payload.new.status,
                                    bid_count: payload.new.bid_count,
                                };
                            }
                            return auction;
                        })
                    );
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, listingType, brand, sellerId, debouncedSearch, condition, minStorage, minPrice, maxPrice, deliveryAvailable, limit, orderBy, ascending, fetchAll]);

    return { auctions, loading, error };
}



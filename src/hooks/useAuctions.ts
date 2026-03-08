'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Auction } from '@/types/auction';
import type { AuctionStatus } from '@/types/database';

interface UseAuctionsOptions {
    status?: AuctionStatus | 'all';
    brand?: string;
    sellerId?: string;
    search?: string;
    condition?: string;
    minStorage?: number;
    limit?: number;
    orderBy?: 'created_at' | 'ends_at' | 'current_price';
    ascending?: boolean;
    /** Set true only when you need order + delivery status (e.g. seller ListingTable). Adds a JOIN overhead. */
    includeOrders?: boolean;
}

export function useAuctions(options: UseAuctionsOptions = {}) {
    const {
        status = 'active',
        brand,
        sellerId,
        search,
        condition,
        minStorage,
        limit = 40,
        orderBy = 'ends_at',
        ascending = true,
        includeOrders = false,
    } = options;

    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(true);
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
            setLoading(true);
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
                        seller_id,
                        storage_gb,
                        auction_images(url, position),
                        orders(id, status, deliveries(status))
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
                        seller_id,
                        storage_gb,
                        auction_images(url, position)
                    `;
                let query = supabase.from('auctions').select(selectCols);

                if (status !== 'all') {
                    query = query.eq('status', status);
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
                query = query.order(orderBy, { ascending }).limit(limit);

                const { data, error: fetchError } = await query;

                if (!isMounted) return;

                if (fetchError) {
                    setError(fetchError.message);
                } else {
                    setAuctions(data as Auction[]);
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
    }, [status, brand, sellerId, debouncedSearch, condition, minStorage, limit, orderBy, ascending]);

    return { auctions, loading, error };
}

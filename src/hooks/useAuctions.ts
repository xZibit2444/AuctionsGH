'use client';

import { useEffect, useState } from 'react';
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
    } = options;

    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchAuctions = async () => {
            setLoading(true);
            const supabase = createClient();
            let query = supabase
                .from('auctions')
                .select('*, auction_images(url, position)');

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
            if (search && search.trim()) {
                const q = search.trim();
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
            setLoading(false);
        };

        fetchAuctions();

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
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, brand, sellerId, search, limit, orderBy, ascending]);

    return { auctions, loading, error };
}

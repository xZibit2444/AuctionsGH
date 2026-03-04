'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Auction } from '@/types/auction';
import type { AuctionStatus } from '@/types/database';

interface UseAuctionsOptions {
    status?: AuctionStatus;
    brand?: string;
    sellerId?: string;
    limit?: number;
    orderBy?: 'created_at' | 'ends_at' | 'current_price';
    ascending?: boolean;
}

export function useAuctions(options: UseAuctionsOptions = {}) {
    const {
        status = 'active',
        brand,
        sellerId,
        limit = 20,
        orderBy = 'ends_at',
        ascending = true,
    } = options;

    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchAuctions = async () => {
            setLoading(true);
            let query = supabase
                .from('auctions')
                .select('*, auction_images(url, position)')
                .eq('status', status)
                .order(orderBy, { ascending })
                .limit(limit);

            if (brand) {
                query = query.eq('brand', brand);
            }
            if (sellerId) {
                query = query.eq('seller_id', sellerId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                setError(fetchError.message);
            } else {
                setAuctions(data as Auction[]);
            }
            setLoading(false);
        };

        fetchAuctions();
    }, [status, brand, sellerId, limit, orderBy, ascending, supabase]);

    return { auctions, loading, error };
}

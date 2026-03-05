'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuctionFull } from '@/types/auction';

export function useAuction(auctionId: string) {
    const [auction, setAuction] = useState<AuctionFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchAuction = async () => {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('auctions')
                .select(
                    `
          *,
          auction_images (*),
          profiles!auctions_seller_id_fkey (
            id, username, avatar_url, location, is_verified
          ),
          orders(id, status)
        `                )
                .eq('id', auctionId)
                .single();

            if (fetchError) {
                setError(fetchError.message);
            } else {
                setAuction(data as unknown as AuctionFull);
            }
            setLoading(false);
        };

        fetchAuction();
    }, [auctionId, supabase]);

    return { auction, loading, error, setAuction };
}

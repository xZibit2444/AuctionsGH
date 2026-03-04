'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BidWithBidder } from '@/types/bid';

export function useBids(auctionId: string) {
    const [bids, setBids] = useState<BidWithBidder[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchBids = async () => {
            const { data } = await supabase
                .from('bids')
                .select(
                    `
          *,
          profiles (id, username, avatar_url)
        `
                )
                .eq('auction_id', auctionId)
                .order('created_at', { ascending: false });

            setBids((data as unknown as BidWithBidder[]) ?? []);
            setLoading(false);
        };

        fetchBids();
    }, [auctionId, supabase]);

    return { bids, setBids, loading };
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BidWithBidder } from '@/types/bid';

export function useBids(auctionId: string) {
    const [bids, setBids] = useState<BidWithBidder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const supabase = createClient();
        const fetchBids = async () => {
            try {
                const { data, error } = await supabase
                    .from('bids')
                    .select(
                        `
          *,
          profiles (id, username, avatar_url)
        `
                    )
                    .eq('auction_id', auctionId)
                    .order('created_at', { ascending: false });

                if (!isMounted) return;
                if (!error) setBids((data as unknown as BidWithBidder[]) ?? []);
            } catch {
                // silently fall through to finally
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchBids();
        return () => { isMounted = false; };
    }, [auctionId]);

    return { bids, setBids, loading };
}

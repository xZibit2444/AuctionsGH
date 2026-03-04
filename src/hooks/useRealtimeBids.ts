'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BidWithBidder } from '@/types/bid';

interface UseRealtimeBidsOptions {
    auctionId: string;
    onNewBid: (bid: BidWithBidder) => void;
    onAuctionUpdate?: (payload: Record<string, unknown>) => void;
}

export function useRealtimeBids({
    auctionId,
    onNewBid,
    onAuctionUpdate,
}: UseRealtimeBidsOptions) {
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel(`auction-${auctionId}`)
            // Listen for new bids
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bids',
                    filter: `auction_id=eq.${auctionId}`,
                },
                async (payload) => {
                    // Fetch the full bid with bidder profile
                    const { data } = await supabase
                        .from('bids')
                        .select('*, profiles (id, username, avatar_url)')
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        onNewBid(data as unknown as BidWithBidder);
                    }
                }
            )
            // Listen for auction status changes (ended, sold)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'auctions',
                    filter: `id=eq.${auctionId}`,
                },
                (payload) => {
                    onAuctionUpdate?.(payload.new as Record<string, unknown>);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [auctionId, supabase, onNewBid, onAuctionUpdate]);
}

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
    useEffect(() => {
        // Create client inside effect so it never appears in the deps array.
        // Having createClient() outside caused a new object every render,
        // which would re-subscribe/unsubscribe the channel on every render.
        const supabase = createClient();

        const channel = supabase
            .channel(`auction-${auctionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bids',
                    filter: `auction_id=eq.${auctionId}`,
                },
                async (payload) => {
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
    }, [auctionId, onNewBid, onAuctionUpdate]);
}

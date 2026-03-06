'use client';

import { useEffect, useRef } from 'react';
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
    // Store callbacks in refs so the channel only subscribes once per auctionId.
    // Without this, every time the parent re-renders with a new callback reference
    // the channel tears down and re-creates, causing missed events and UI freezes.
    const onNewBidRef = useRef(onNewBid);
    const onAuctionUpdateRef = useRef(onAuctionUpdate);

    useEffect(() => {
        onNewBidRef.current = onNewBid;
    }, [onNewBid]);

    useEffect(() => {
        onAuctionUpdateRef.current = onAuctionUpdate;
    }, [onAuctionUpdate]);

    useEffect(() => {
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
                        onNewBidRef.current(data as unknown as BidWithBidder);
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
                    onAuctionUpdateRef.current?.(payload.new as Record<string, unknown>);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [auctionId]);
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuctionFull } from '@/types/auction';

export function useAuction(auctionId: string) {
    const [auction, setAuction] = useState<AuctionFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Create client inside the effect so it is never in the deps array.
        // Having createClient() outside caused a new object every render
        // → effect re-ran on every render → infinite fetch loop.
        const supabase = createClient();
        const fetchAuction = async () => {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('auctions')
                .select(
                    `
          *,
          auction_images (url, position),
          profiles!auctions_seller_id_fkey (
            id, username, full_name, avatar_url, location, is_verified
          ),
          orders(id, status)
        `
                )
                .eq('id', auctionId)
                .single();

            if (fetchError) {
                setError(fetchError.message);
            } else {
                type AuctionWithWinnerNote = AuctionFull & {
                    auction_winner_notes?: { note: string }[] | null;
                };
                type WinnerNoteRow = { note: string } | null;

                const baseAuction = data as unknown as AuctionWithWinnerNote;

                // Best-effort fetch for optional winner note. This should never block checkout/details.
                const { data: noteData } = await supabase
                    .from('auction_winner_notes')
                    .select('note')
                    .eq('auction_id', auctionId)
                    .maybeSingle();

                const winnerNote = noteData as WinnerNoteRow;
                if (winnerNote?.note) {
                    baseAuction.auction_winner_notes = [{ note: winnerNote.note }];
                }

                setAuction(baseAuction as unknown as AuctionFull);
            }
            setLoading(false);
        };

        fetchAuction();
    }, [auctionId]); // auctionId only — no supabase reference needed here

    return { auction, loading, error, setAuction };
}

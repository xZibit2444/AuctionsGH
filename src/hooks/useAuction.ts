'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuctionFull } from '@/types/auction';

export function useAuction(auctionId: string, initialAuction?: AuctionFull | null) {
    const [auction, setAuction] = useState<AuctionFull | null>(initialAuction ?? null);
    const [loading, setLoading] = useState(!initialAuction);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Create client inside the effect so it is never in the deps array.
        // Having createClient() outside caused a new object every render
        // → effect re-ran on every render → infinite fetch loop.
        const supabase = createClient();
        if (initialAuction) setAuction(initialAuction);
        const fetchAuction = async () => {
            // Keep server-rendered public content visible while private state refreshes.
            if (!initialAuction) setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('auctions')
                .select(
                    `
          *,
          auction_images (url, position),
          listing_videos (id, content_type, duration_seconds),
          profiles!auctions_seller_id_fkey (
            id, username, full_name, avatar_url, location, is_verified, phone_number, whatsapp_enabled
          ),
          orders(id, status, buyer_id),
          auction_offers(id, buyer_id, amount, counter_amount, status)
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
    }, [auctionId, initialAuction]); // No supabase client in dependencies.

    return { auction, loading, error, setAuction };
}

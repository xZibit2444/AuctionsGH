'use client';

import { createContext, useContext, useEffect, useState, useCallback, startTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SavedAuctionsContextType {
    savedIds: Set<string>;
    toggleSave: (auctionId: string) => Promise<void>;
}

const SavedAuctionsContext = createContext<SavedAuctionsContextType>({
    savedIds: new Set(),
    toggleSave: async () => {},
});

export function SavedAuctionsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) {
            startTransition(() => setSavedIds(new Set()));
            return;
        }

        let isMounted = true;
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('saved_auctions') as any)
            .select('auction_id')
            .eq('user_id', user.id)
            .then(({ data }: { data: { auction_id: string }[] | null }) => {
                if (isMounted) startTransition(() => setSavedIds(new Set((data ?? []).map((r) => r.auction_id))));
            })
            .catch(() => {});

        return () => { isMounted = false; };
    }, [user]);

    const toggleSave = useCallback(
        async (auctionId: string) => {
            if (!user) return;
            const supabase = createClient();
            const isSaved = savedIds.has(auctionId);

            setSavedIds((prev) => {
                const next = new Set(prev);
                if (isSaved) next.delete(auctionId);
                else next.add(auctionId);
                return next;
            });

            if (isSaved) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('saved_auctions') as any)
                    .delete()
                    .eq('user_id', user.id)
                    .eq('auction_id', auctionId);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('saved_auctions') as any)
                    .insert({ user_id: user.id, auction_id: auctionId });
            }
        },
        [user, savedIds]
    );

    return (
        <SavedAuctionsContext.Provider value={{ savedIds, toggleSave }}>
            {children}
        </SavedAuctionsContext.Provider>
    );
}

export function useSavedAuctionsContext() {
    return useContext(SavedAuctionsContext);
}

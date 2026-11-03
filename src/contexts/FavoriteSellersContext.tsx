'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

interface FavoriteSellersContextType {
    favoriteSellerIds: Set<string>;
    toggleFavoriteSeller: (sellerId: string) => Promise<void>;
}

const FavoriteSellersContext = createContext<FavoriteSellersContextType>({
    favoriteSellerIds: new Set(),
    toggleFavoriteSeller: async () => {},
});

function getStorageKey(userId: string) {
    return `favorite-sellers:${userId}`;
}

function readLocal(userId: string): string[] {
    try {
        const stored = window.localStorage.getItem(getStorageKey(userId));
        const parsed = stored ? (JSON.parse(stored) as string[]) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeLocal(userId: string, ids: Iterable<string>) {
    try {
        window.localStorage.setItem(getStorageKey(userId), JSON.stringify([...ids]));
    } catch {
        // storage unavailable
    }
}

export function FavoriteSellersProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [favoriteSellerIds, setFavoriteSellerIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) {
            queueMicrotask(() => setFavoriteSellerIds(new Set()));
            return;
        }

        let isMounted = true;
        const local = readLocal(user.id);
        queueMicrotask(() => {
            if (isMounted) setFavoriteSellerIds(new Set(local));
        });

        const sync = async () => {
            try {
                const supabase = createClient();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const table = supabase.from('favorite_sellers') as any;
                const { data, error } = await table.select('seller_id').eq('user_id', user.id);
                if (error) return; // table unavailable: keep device-local favorites
                const remote = (data ?? []).map((r: { seller_id: string }) => r.seller_id);
                const remoteSet = new Set<string>(remote);
                const migratedKey = `${getStorageKey(user.id)}:synced`;
                const alreadyMigrated = window.localStorage.getItem(migratedKey) === '1';
                const missing = alreadyMigrated ? [] : local.filter((id) => !remoteSet.has(id));
                if (missing.length > 0) {
                    // One-time copy of favorites saved on this device into the account
                    const { error: upsertError } = await table.upsert(
                        missing.map((seller_id) => ({ user_id: user.id, seller_id })),
                        { onConflict: 'user_id,seller_id', ignoreDuplicates: true }
                    );
                    if (upsertError) return;
                }
                try { window.localStorage.setItem(migratedKey, '1'); } catch { /* ignore */ }
                // After the one-time copy, the account is the source of truth
                const merged = new Set<string>(alreadyMigrated ? remote : [...remote, ...local]);
                writeLocal(user.id, merged);
                if (isMounted) setFavoriteSellerIds(merged);
            } catch {
                // keep device-local favorites
            }
        };
        sync();

        return () => { isMounted = false; };
    }, [user]);

    const toggleFavoriteSeller = useCallback(async (sellerId: string) => {
        if (!user) return;
        const wasFavorite = favoriteSellerIds.has(sellerId);
        const next = new Set(favoriteSellerIds);
        if (wasFavorite) next.delete(sellerId);
        else next.add(sellerId);
        setFavoriteSellerIds(next);
        writeLocal(user.id, next);

        try {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const table = supabase.from('favorite_sellers') as any;
            if (wasFavorite) {
                await table.delete().eq('user_id', user.id).eq('seller_id', sellerId);
            } else {
                await table.upsert(
                    { user_id: user.id, seller_id: sellerId },
                    { onConflict: 'user_id,seller_id', ignoreDuplicates: true }
                );
            }
        } catch {
            // local copy is kept; next load retries the sync
        }
    }, [user, favoriteSellerIds]);

    return (
        <FavoriteSellersContext.Provider value={{ favoriteSellerIds, toggleFavoriteSeller }}>
            {children}
        </FavoriteSellersContext.Provider>
    );
}

export function useFavoriteSellersContext() {
    return useContext(FavoriteSellersContext);
}

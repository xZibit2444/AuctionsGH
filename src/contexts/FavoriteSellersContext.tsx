'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

export function FavoriteSellersProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [favoriteSellerIds, setFavoriteSellerIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        queueMicrotask(() => {
            if (!user) {
                setFavoriteSellerIds(new Set());
                return;
            }

            try {
                const stored = window.localStorage.getItem(getStorageKey(user.id));
                const parsed = stored ? (JSON.parse(stored) as string[]) : [];
                setFavoriteSellerIds(new Set(parsed));
            } catch {
                setFavoriteSellerIds(new Set());
            }
        });
    }, [user]);

    const toggleFavoriteSeller = useCallback(async (sellerId: string) => {
        if (!user) return;

        setFavoriteSellerIds((prev) => {
            const next = new Set(prev);
            if (next.has(sellerId)) next.delete(sellerId);
            else next.add(sellerId);

            window.localStorage.setItem(getStorageKey(user.id), JSON.stringify([...next]));
            return next;
        });
    }, [user]);

    return (
        <FavoriteSellersContext.Provider value={{ favoriteSellerIds, toggleFavoriteSeller }}>
            {children}
        </FavoriteSellersContext.Provider>
    );
}

export function useFavoriteSellersContext() {
    return useContext(FavoriteSellersContext);
}

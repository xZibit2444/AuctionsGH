'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoriteSellersProvider } from '@/contexts/FavoriteSellersContext';
import { SavedAuctionsProvider } from '@/contexts/SavedAuctionsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

/**
 * App-wide providers. AuthProvider is here so the auth state is shared
 * across all components without each having its own subscription.
 * SavedAuctionsProvider gives every AuctionCard access to saved state
 * from a single shared DB query instead of one query per card.
 */
export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <FavoriteSellersProvider>
                    <SavedAuctionsProvider>
                        {children}
                    </SavedAuctionsProvider>
                </FavoriteSellersProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

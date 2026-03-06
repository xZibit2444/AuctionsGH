'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * App-wide providers. AuthProvider is here so the auth state is shared
 * across all components without each having its own subscription.
 */
export default function Providers({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}

'use client';

import { ReactNode } from 'react';

/**
 * Providers wrapper for app-wide context.
 * Add QueryClientProvider, ThemeProvider, etc. here as needed.
 */
export default function Providers({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

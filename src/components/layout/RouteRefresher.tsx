'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Forces a full browser reload on every client-side navigation.
 * This prevents stale auth state and UI hangs when moving between pages.
 */
export default function RouteRefresher() {
    const pathname = usePathname();
    const prevPath = useRef<string | null>(null);

    useEffect(() => {
        if (prevPath.current !== null && prevPath.current !== pathname) {
            // Full reload preserving query string and hash
            window.location.replace(
                pathname + window.location.search + window.location.hash
            );
        }
        prevPath.current = pathname;
    }, [pathname]);

    return null;
}

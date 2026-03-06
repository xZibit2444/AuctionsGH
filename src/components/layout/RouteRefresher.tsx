'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Calls router.refresh() on client-side navigations so server components
 * re-fetch their data with fresh auth cookies. This is a lightweight
 * alternative to the old full-page window.location.replace().
 */
export default function RouteRefresher() {
    const pathname = usePathname();
    const router = useRouter();
    const prevPath = useRef<string | null>(null);

    useEffect(() => {
        if (prevPath.current !== null && prevPath.current !== pathname) {
            router.refresh();
        }
        prevPath.current = pathname;
    }, [pathname, router]);

    return null;
}

'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

// Fires a GA4 sign_up event when the auth callback flags a brand-new OAuth account
// (?signup=oauth&provider=google), then strips the params from the URL.
function SignupTrackerInner() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (searchParams.get('signup') !== 'oauth') return;
        const provider = searchParams.get('provider') || 'oauth';
        trackEvent('sign_up', { method: provider });
        const params = new URLSearchParams(searchParams.toString());
        params.delete('signup');
        params.delete('provider');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, [searchParams, pathname, router]);

    return null;
}

export default function SignupTracker() {
    return (
        <Suspense fallback={null}>
            <SignupTrackerInner />
        </Suspense>
    );
}

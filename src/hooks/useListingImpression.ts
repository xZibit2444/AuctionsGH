'use client';
import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';

/** A listing card impression requires at least 50% visibility for one second.
 * Once per card mount; this is not a unique-person or unique-session count.
 */
export function useListingImpression(listingId: string, category: string) {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!ref.current || typeof IntersectionObserver === 'undefined') return;
        let sent = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const observer = new IntersectionObserver(([entry]) => {
            if (timer) clearTimeout(timer);
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || sent) return;
            timer = setTimeout(() => {
                if (document.visibilityState !== 'visible') return;
                sent = true;
                trackEvent('listing_impression', { listing_id: listingId, listing_category: category, measurement_version: 'contact_v1' });
                observer.disconnect();
            }, 1000);
        }, { threshold: [0, 0.5] });
        observer.observe(ref.current);
        return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
    }, [listingId, category]);
    return ref;
}

// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { useListingImpression } from '@/hooks/useListingImpression';
const tracked = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics', () => ({ trackEvent: tracked }));
function Card() { const ref = useListingImpression('listing-1', 'Phones & Tablets'); return <article ref={ref}>Phone</article>; }

describe('visible listing impression measurement', () => {
    it('requires 50% visibility for one second and sends once per card mount', async () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        let callback: IntersectionObserverCallback = () => {};
        const disconnect = vi.fn();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { callback = cb; } observe() {} disconnect = disconnect; });
        const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
        await act(async () => root.render(<Card />));
        const intersect = (ratio: number) => callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry], {} as IntersectionObserver);
        intersect(0.4); vi.advanceTimersByTime(1100); expect(tracked).not.toHaveBeenCalled();
        intersect(0.8); vi.advanceTimersByTime(999); expect(tracked).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(tracked).toHaveBeenCalledWith('listing_impression', { listing_id: 'listing-1', listing_category: 'Phones & Tablets', measurement_version: 'contact_v1' });
        intersect(0.9); vi.advanceTimersByTime(2000); expect(tracked).toHaveBeenCalledTimes(1);
        await act(async () => root.unmount()); el.remove(); vi.unstubAllGlobals(); vi.useRealTimers();
    });
});

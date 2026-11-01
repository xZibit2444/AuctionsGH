// Lightweight GA4 event tracking helper.
// Fires only when the gtag snippet (loaded in app/layout.tsx) is present on the page.
declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

export function trackEvent(name: string, params?: Record<string, string | number>) {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params ?? {});
}

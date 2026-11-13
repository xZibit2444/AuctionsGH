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

/**
 * Browse-to-contact conversion: a buyer tapped a contact CTA on a listing page.
 * Counts initiations only - a WhatsApp tap opens WhatsApp and a chat tap opens
 * the in-house thread; neither proves a message was sent. Post-sale contact
 * (winner banner, accepted-offer banner, deal room) is not tracked here.
 */
export function trackContactSeller(listingId: string, category: string, method: 'whatsapp' | 'chat') {
    trackEvent('contact_seller', {
        listing_id: listingId,
        listing_category: category,
        contact_method: method,
        measurement_version: 'contact_v1',
    });
}

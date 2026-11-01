// Appends newsletter UTM tags so email traffic shows up under its own source
// in Google Analytics instead of being lumped into Direct.
export function withNewsletterUtm(url: string, campaign: string): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}`;
}

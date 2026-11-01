import { createHmac, timingSafeEqual } from 'crypto';

// Signed unsubscribe links. The token is an HMAC of the user id, so a link only works for the person it was made for.
function secret(): string {
    const s = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('No signing secret configured');
    return s;
}

export function signUnsubscribe(userId: string): string {
    return createHmac('sha256', secret()).update(`newsletter-unsubscribe:${userId}`).digest('hex');
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
    try {
        const expected = Buffer.from(signUnsubscribe(userId), 'hex');
        const given = Buffer.from(token, 'hex');
        return expected.length === given.length && timingSafeEqual(expected, given);
    } catch {
        return false;
    }
}

export function unsubscribeUrl(userId: string, site = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com'): string {
    return `${site}/unsubscribe?u=${encodeURIComponent(userId)}&t=${signUnsubscribe(userId)}`;
}

// First name for the greeting: first word of the saved name. A name that is just the email username (the signup
// fallback) is not a real name, so it gets a plain greeting. Names are used exactly as saved.
export function greetingName(fullName: string | null | undefined, email: string | null | undefined): string {
    const name = (fullName ?? '').trim();
    if (!name) return '';
    const local = (email ?? '').split('@')[0].trim().toLowerCase();
    if (local && name.toLowerCase() === local) return '';
    return name.split(/\s+/)[0];
}

import { GHANA_PHONE_REGEX } from './constants';

/** Normalise a Ghana number to +233XXXXXXXXX, or return null if it is not valid. */
export function normalizeGhanaPhone(value: string): string | null {
    const compact = value.replace(/[\s()-]/g, '');
    let candidate = compact;
    if (/^0\d{9}$/.test(compact)) candidate = `+233${compact.slice(1)}`;
    else if (/^233\d{9}$/.test(compact)) candidate = `+${compact}`;
    else if (/^\d{9}$/.test(compact)) candidate = `+233${compact}`;
    return GHANA_PHONE_REGEX.test(candidate) ? candidate : null;
}

/** Routes a signed-in user may visit without a phone number on file. */
const EXEMPT_PREFIXES = [
    '/complete-profile', '/login', '/signup', '/callback', '/verify-email',
    '/forgot-password', '/reset-password', '/privacy', '/terms', '/unsubscribe', '/api',
];

export function isPhoneGateExempt(pathname: string): boolean {
    return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Only same-site relative paths are allowed as a post-save destination. */
export function safeNextPath(raw: string | null | undefined): string {
    return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/complete-profile') ? raw : '/';
}

export function buildAuthRedirectUrl(next = '/') {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    const baseUrl = configuredSiteUrl
        ? configuredSiteUrl.replace(/\/+$/, '')
        : (typeof window !== 'undefined'
            ? window.location.origin.replace('0.0.0.0', 'localhost')
            : '');

    const target = next.startsWith('/') && !next.startsWith('//') ? next : '/';

    return `${baseUrl}/callback?next=${encodeURIComponent(target)}`;
}

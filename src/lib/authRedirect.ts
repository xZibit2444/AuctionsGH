function normalizeBaseUrl(url?: string) {
    return url?.trim().replace(/\/+$/, '') ?? '';
}

function normalizeNextPath(next = '/') {
    return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function resolveServerSiteUrl(requestUrl?: string) {
    const configuredSiteUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com');
    if (configuredSiteUrl) {
        return configuredSiteUrl;
    }

    if (process.env.NODE_ENV !== 'production' && requestUrl) {
        return normalizeBaseUrl(new URL(requestUrl).origin.replace('0.0.0.0', 'localhost'));
    }

    return '';
}

export function buildAuthRedirectUrl(next = '/') {
    const browserOrigin = typeof window !== 'undefined'
        ? normalizeBaseUrl(window.location.origin.replace('0.0.0.0', 'localhost'))
        : '';

    const baseUrl = browserOrigin || resolveServerSiteUrl();
    const target = normalizeNextPath(next);

    return `${baseUrl}/callback?next=${encodeURIComponent(target)}`;
}

export function buildServerAuthRedirectUrl(next = '/', requestUrl?: string) {
    const baseUrl = resolveServerSiteUrl(requestUrl);
    const target = normalizeNextPath(next);

    return `${baseUrl}/callback?next=${encodeURIComponent(target)}`;
}

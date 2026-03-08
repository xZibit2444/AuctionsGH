import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/dashboard/',
                    '/settings/',
                    '/checkout/',
                    '/orders/',
                    '/api/',
                    '/(auth)/',
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}

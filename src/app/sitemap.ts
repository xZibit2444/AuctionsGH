import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    // Static public routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/faq`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${SITE_URL}/contact`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/safety`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/privacy`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${SITE_URL}/seller-apply`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
    ];

    // Dynamic auction routes — active and recently ended
    let auctionRoutes: MetadataRoute.Sitemap = [];
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('auctions')
            .select('id, updated_at')
            .in('status', ['active', 'sold'])
            .order('updated_at', { ascending: false })
            .limit(500);

        const auctions = data as Array<{ id: string; updated_at: string }> | null;

        if (auctions) {
            auctionRoutes = auctions.map((a) => ({
                url: `${SITE_URL}/auctions/${a.id}`,
                lastModified: a.updated_at ? new Date(a.updated_at) : now,
                changeFrequency: 'hourly' as const,
                priority: 0.8,
            }));
        }
    } catch {
        // Sitemap generation continues with static routes only if DB is unreachable
    }

    return [...staticRoutes, ...auctionRoutes];
}

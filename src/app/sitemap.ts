import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            changeFrequency: 'hourly',
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/auctions`,
            changeFrequency: 'hourly',
            priority: 0.95,
        },
        {
            url: `${SITE_URL}/faq`,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${SITE_URL}/contact`,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/safety`,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/privacy`,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.4 },
        { url: `${SITE_URL}/news`, changeFrequency: 'weekly', priority: 0.5 },
        {
            url: `${SITE_URL}/listings`,
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];

    let auctionRoutes: MetadataRoute.Sitemap = [];
    let sellerRoutes: MetadataRoute.Sitemap = [];

    try {
        const supabase = await createClient();
        const [{ data: auctions }, { data: sellers }] = await Promise.all([
            supabase
                .from('auctions')
                .select('id, updated_at')
                .in('status', ['active', 'sold'])
                .order('updated_at', { ascending: false })
                .limit(500),
            supabase
                .from('profiles')
                .select('id, updated_at')
                .eq('is_admin', true)
                .order('updated_at', { ascending: false })
                .limit(250),
        ]);

        const auctionRows = auctions as Array<{ id: string; updated_at: string }> | null;
        const sellerRows = sellers as Array<{ id: string; updated_at: string }> | null;

        if (auctionRows) {
            auctionRoutes = auctionRows.map((auction) => ({
                url: `${SITE_URL}/auctions/${auction.id}`,
                ...(auction.updated_at ? { lastModified: new Date(auction.updated_at) } : {}),
                changeFrequency: 'hourly',
                priority: 0.8,
            }));
        }

        if (sellerRows) {
            sellerRoutes = sellerRows.map((seller) => ({
                url: `${SITE_URL}/sellers/${seller.id}`,
                ...(seller.updated_at ? { lastModified: new Date(seller.updated_at) } : {}),
                changeFrequency: 'daily',
                priority: 0.7,
            }));
        }
    } catch {
        // Continue with static routes if the database is unavailable.
    }

    return [...staticRoutes, ...auctionRoutes, ...sellerRoutes];
}

import type { Metadata } from 'next';
import { getPublicBrowse } from '@/lib/publicBrowse';
import { serializeJsonLd } from '@/lib/seo';
import HomePageClient from '@/components/auction/HomePageClient';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = '/opengraph-image';

export const metadata: Metadata = {
    title: "Buy and Sell in Ghana",
    description: 'Buy and sell phones, furniture, electronics, vehicles and more across Ghana. Browse fixed-price listings, make an offer or bid in live auctions.',
    alternates: { canonical: SITE_URL },
    openGraph: {
        title: "AuctionsGH - Buy and Sell in Ghana",
        description: 'Browse fixed-price listings and live auctions from sellers across Ghana.',
        url: SITE_URL,
        siteName: 'AuctionsGH',
        type: 'website',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'AuctionsGH marketplace' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: "AuctionsGH - Buy and Sell in Ghana",
        description: 'Browse fixed-price listings and live auctions from sellers across Ghana.',
        images: [DEFAULT_OG_IMAGE],
    },
};

export default async function HomePage() {
    const initialAuctions = await getPublicBrowse(undefined, true);
    return <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'AuctionsGH', url: SITE_URL }) }} />
        <HomePageClient initialAuctions={initialAuctions} />
    </>;
}

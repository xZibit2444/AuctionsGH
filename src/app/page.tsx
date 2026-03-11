import type { Metadata } from 'next';
import HomePageClient from '@/components/auction/HomePageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';
const DEFAULT_OG_IMAGE = '/opengraph-image';

export const metadata: Metadata = {
    title: "Live Auctions in Ghana",
    description: 'Browse live AuctionsGH listings, ending-soon deals, top bids, and newly listed items across Ghana.',
    alternates: { canonical: SITE_URL },
    openGraph: {
        title: "AuctionsGH - Live Auctions in Ghana",
        description: 'Browse live auctions, top bids, and newly listed items on AuctionsGH.',
        url: SITE_URL,
        siteName: 'AuctionsGH',
        type: 'website',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'AuctionsGH marketplace' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: "AuctionsGH - Live Auctions in Ghana",
        description: 'Browse live auctions, top bids, and newly listed items on AuctionsGH.',
        images: [DEFAULT_OG_IMAGE],
    },
};

export default function HomePage() {
    return <HomePageClient />;
}

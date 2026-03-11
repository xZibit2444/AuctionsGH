import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';
const DEFAULT_OG_IMAGE = '/opengraph-image';

export const metadata: Metadata = {
    title: 'FAQ',
    description: 'Frequently asked questions about AuctionsGH — how auctions work, payment, delivery, safety, and seller info.',
    alternates: { canonical: `${SITE_URL}/faq` },
    openGraph: {
        title: 'FAQ | AuctionsGH',
        description: 'Everything you need to know about bidding, buying, and selling on AuctionsGH.',
        url: `${SITE_URL}/faq`,
        siteName: 'AuctionsGH',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'AuctionsGH FAQ' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FAQ | AuctionsGH',
        description: 'Frequently asked questions about bidding, buying, and selling on AuctionsGH.',
        images: [DEFAULT_OG_IMAGE],
    },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export const metadata: Metadata = {
    title: 'FAQ',
    description: 'Frequently asked questions about AuctionsGH — how auctions work, payment, delivery, safety, and seller info.',
    alternates: { canonical: `${SITE_URL}/faq` },
    openGraph: {
        title: 'FAQ | AuctionsGH',
        description: 'Everything you need to know about bidding, buying, and selling on AuctionsGH.',
        url: `${SITE_URL}/faq`,
        siteName: 'AuctionsGH',
        images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'AuctionsGH FAQ' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FAQ | AuctionsGH',
        description: 'Frequently asked questions about bidding, buying, and selling on AuctionsGH.',
        images: ['/logo.png'],
    },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

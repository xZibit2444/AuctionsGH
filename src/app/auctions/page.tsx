import type { Metadata } from 'next';
import AuctionsPageClient from '@/components/auction/AuctionsPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

type AuctionsPageProps = {
    searchParams: Promise<{ q?: string; brand?: string; sort?: string }>;
};

export async function generateMetadata({ searchParams }: AuctionsPageProps): Promise<Metadata> {
    const { q, brand } = await searchParams;
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);

    const titleParts = ['Browse Auctions'];
    if (brand) titleParts.push(brand);
    if (q) titleParts.push(`"${q}"`);

    const title = titleParts.join(' - ');
    const description = q
        ? `Search AuctionsGH listings for ${q}${brand ? ` in ${brand}` : ''}. Browse active and recently sold marketplace items in Ghana.`
        : brand
            ? `Browse ${brand} listings on AuctionsGH, including active auctions and recently sold marketplace items in Ghana.`
            : 'Browse active and recently sold AuctionsGH listings across phones, electronics, vehicles, fashion, and more in Ghana.';

    const canonical = params.toString() ? `${SITE_URL}/auctions?${params.toString()}` : `${SITE_URL}/auctions`;

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title: `${title} | AuctionsGH`,
            description,
            url: canonical,
            siteName: 'AuctionsGH',
            type: 'website',
            images: [{ url: '/logo.png', width: 1200, height: 630, alt: title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | AuctionsGH`,
            description,
            images: ['/logo.png'],
        },
    };
}

export default function AuctionsPage() {
    return <AuctionsPageClient />;
}

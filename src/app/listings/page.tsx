import type { Metadata } from 'next';
import { PermanentListingsPageClient } from '@/components/auction/AuctionsPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';
const DEFAULT_OG_IMAGE = '/opengraph-image';

type ListingsPageProps = {
    searchParams: Promise<{ q?: string; brand?: string; sort?: string }>;
};

export async function generateMetadata({ searchParams }: ListingsPageProps): Promise<Metadata> {
    const { q, brand } = await searchParams;
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);

    const titleParts = ['Permanent Listings'];
    if (brand) titleParts.push(brand);
    if (q) titleParts.push(`"${q}"`);

    const title = titleParts.join(' - ');
    const description = q
        ? `Search permanent AuctionsGH listings for ${q}${brand ? ` in ${brand}` : ''}. Browse always-on marketplace items in Ghana.`
        : brand
            ? `Browse permanent ${brand} listings on AuctionsGH.`
            : 'Browse permanent AuctionsGH listings across phones, electronics, vehicles, fashion, and more in Ghana.';

    const canonical = params.toString() ? `${SITE_URL}/listings?${params.toString()}` : `${SITE_URL}/listings`;

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
            images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | AuctionsGH`,
            description,
            images: [DEFAULT_OG_IMAGE],
        },
    };
}

export default function ListingsPage() {
    return <PermanentListingsPageClient />;
}

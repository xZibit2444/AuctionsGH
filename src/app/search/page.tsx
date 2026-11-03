import type { Metadata } from 'next';
import { getPublicBrowse } from '@/lib/publicBrowse';
import { SearchListingsPageClient } from '@/components/auction/AuctionsPageClient';

export const metadata: Metadata = {
    title: 'Search auctions and permanent listings',
    description: 'Search both auctions and permanent listings on AuctionsGH.',
    robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const initialAuctions = Object.keys(params).length === 0 ? await getPublicBrowse() : undefined;
    return <SearchListingsPageClient initialAuctions={initialAuctions} />;
}

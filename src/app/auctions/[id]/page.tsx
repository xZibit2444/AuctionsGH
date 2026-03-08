import type { Metadata } from 'next';
import AuctionDetail from '@/components/auction/AuctionDetail';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

interface AuctionPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AuctionPageProps): Promise<Metadata> {
    const { id } = await params;
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('auctions')
            .select('title, description, brand, model, condition, current_price, status')
            .eq('id', id)
            .single();

        const auction = data as {
            title: string;
            description: string | null;
            brand: string;
            model: string;
            condition: string;
            current_price: number;
            status: string;
        } | null;

        if (!auction) {
            return { title: 'Auction Not Found' };
        }

        const title = auction.title || `${auction.brand} ${auction.model}`;
        const description =
            auction.description ||
            `Bid on a ${auction.condition} ${auction.brand} ${auction.model} — current price GH₵${auction.current_price}. Live auction on AuctionsGH.`;
        const pageUrl = `${SITE_URL}/auctions/${id}`;

        return {
            title,
            description,
            alternates: { canonical: pageUrl },
            openGraph: {
                title: `${title} | AuctionsGH`,
                description,
                url: pageUrl,
                type: 'website',
                siteName: 'AuctionsGH',
                images: [{ url: '/logo.png', width: 1200, height: 630, alt: title }],
            },
            twitter: {
                card: 'summary_large_image',
                title: `${title} | AuctionsGH`,
                description,
                images: ['/logo.png'],
            },
        };
    } catch {
        return { title: 'Auction Details' };
    }
}

export default async function AuctionPage({ params }: AuctionPageProps) {
    const { id } = await params;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AuctionDetail auctionId={id} />
        </div>
    );
}

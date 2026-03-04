import AuctionDetail from '@/components/auction/AuctionDetail';

export const metadata = {
    title: 'Auction Details — AuctionsGH',
};

interface AuctionPageProps {
    params: Promise<{ id: string }>;
}

export default async function AuctionPage({ params }: AuctionPageProps) {
    const { id } = await params;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <AuctionDetail auctionId={id} />
        </div>
    );
}

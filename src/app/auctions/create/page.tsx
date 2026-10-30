import SellerGuard from '@/components/auth/SellerGuard';
import CreateAuctionForm from '@/components/auction/CreateAuctionForm';

export const metadata = {
    title: 'Sell an Item — AuctionsGH',
};

export default async function CreateAuctionPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
    const { from } = await searchParams;
    return (
        <SellerGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Sell Your Item
                </h1>
                <CreateAuctionForm copyFromId={typeof from === 'string' && /^[0-9a-f-]{36}$/i.test(from) ? from : undefined} />
            </div>
        </SellerGuard>
    );
}

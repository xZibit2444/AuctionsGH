import SellerGuard from '@/components/auth/SellerGuard';
import EditListingForm from '@/components/auction/EditListingForm';

export const metadata = {
    title: 'Edit Listing — AuctionsGH',
};

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <SellerGuard>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-black tracking-tight text-black mb-6">Edit Listing</h1>
                <EditListingForm auctionId={id} />
            </div>
        </SellerGuard>
    );
}

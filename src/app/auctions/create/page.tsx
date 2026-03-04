import AuthGuard from '@/components/auth/AuthGuard';
import CreateAuctionForm from '@/components/auction/CreateAuctionForm';

export const metadata = {
    title: 'Sell a Phone — AuctionsGH',
};

export default function CreateAuctionPage() {
    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Sell Your Phone
                </h1>
                <CreateAuctionForm />
            </div>
        </AuthGuard>
    );
}

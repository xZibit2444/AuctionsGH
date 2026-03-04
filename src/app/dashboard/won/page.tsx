import AuthGuard from '@/components/auth/AuthGuard';
import WonAuctionsList from '@/components/dashboard/WonAuctionsList';

export const metadata = {
    title: 'Won Auctions — AuctionsGH',
};

export default function WonPage() {
    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Auctions Won 🏆
                </h1>
                <WonAuctionsList />
            </div>
        </AuthGuard>
    );
}

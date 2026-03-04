'use client';

import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';

export default function AuctionsPage() {
    const { auctions, loading } = useAuctions({ status: 'active' });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Browse Auctions
            </h1>
            <AuctionGrid auctions={auctions} loading={loading} />
        </div>
    );
}

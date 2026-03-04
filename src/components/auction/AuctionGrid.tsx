import AuctionCard from './AuctionCard';
import { AuctionCardSkeleton } from '@/components/ui/Skeleton';
import { Package } from 'lucide-react';
import type { Auction } from '@/types/auction';

interface AuctionGridProps {
    auctions: Auction[];
    loading?: boolean;
}

export default function AuctionGrid({ auctions, loading }: AuctionGridProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
                {Array.from({ length: 8 }).map((_, i) => (
                    <AuctionCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (auctions.length === 0) {
        return (
            <div className="text-center py-20 border border-gray-200">
                <Package className="mx-auto h-10 w-10 text-gray-300 mb-4" strokeWidth={1} />
                <h3 className="text-sm font-bold text-black uppercase tracking-widest">
                    No auctions found
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                    Try adjusting your filters or check back later.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
            {auctions.map((auction) => (
                <div key={auction.id} className="bg-white">
                    <AuctionCard auction={auction} />
                </div>
            ))}
        </div>
    );
}

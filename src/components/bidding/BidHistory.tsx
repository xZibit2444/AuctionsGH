import { formatCurrency, timeAgo, formatDisplayName } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import type { BidWithBidder } from '@/types/bid';

interface BidHistoryProps {
    bids: BidWithBidder[];
    loading?: boolean;
}

export default function BidHistory({ bids, loading }: BidHistoryProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bid History</h3>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-black mb-3">
                Bid History ({bids.length})
            </h3>

            {bids.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                    No bids yet. Be the first!
                </p>
            ) : (
                <div className="space-y-0.5 max-h-72 overflow-y-auto pr-2 scrollbar-hide">
                    {bids.map((bid, i) => (
                        <div
                            key={bid.id}
                            className={`flex items-center gap-3.5 p-3.5 transition-colors ${i === 0
                                ? 'bg-gray-50 border border-gray-200'
                                : 'hover:bg-gray-50 border border-transparent'
                                }`}
                        >
                            <Avatar
                                name={formatDisplayName(bid.profiles?.username)}
                                size="sm"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-black truncate tracking-tight">
                                    {formatDisplayName(bid.profiles?.username)}
                                    {i === 0 && (
                                        <span className="ml-2 bg-black text-white px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                                            Highest
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs font-medium text-gray-500 mt-0.5">
                                    {timeAgo(bid.created_at)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`text-base font-extrabold tracking-tight ${i === 0 ? 'text-black' : 'text-gray-800'
                                    }`}>
                                    {formatCurrency(bid.amount)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

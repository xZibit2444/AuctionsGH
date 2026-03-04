import { formatCurrency, timeAgo } from '@/lib/utils';
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
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Bid History ({bids.length})
            </h3>

            {bids.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    No bids yet. Be the first!
                </p>
            ) : (
                <div className="space-y-0.5 max-h-72 overflow-y-auto pr-2 scrollbar-hide">
                    {bids.map((bid, i) => (
                        <div
                            key={bid.id}
                            className={`flex items-center gap-3.5 p-3.5 rounded-2xl transition-colors ${i === 0
                                ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                                }`}
                        >
                            <Avatar
                                src={bid.profiles?.avatar_url}
                                name={bid.profiles?.username ?? 'Bidder'}
                                size="sm"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate tracking-tight">
                                    {bid.profiles?.username}
                                    {i === 0 && (
                                        <span className="ml-2 text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold">
                                            Highest
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                    {timeAgo(bid.created_at)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={`text-base font-extrabold tracking-tight ${i === 0 ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'
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

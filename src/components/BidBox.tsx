'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';
import CountdownTimer from './CountdownTimer';
import Avatar from './ui/Avatar';
import type { BidWithBidder } from '@/types/bid';

interface BidBoxProps {
    auctionId: string;
    initialPrice: number;
    minIncrement: number;
    endsAt: string;
    sellerId: string;
    initialBids?: BidWithBidder[];
}

export default function BidBox({
    auctionId,
    initialPrice,
    minIncrement,
    endsAt,
    sellerId,
    initialBids = [],
}: BidBoxProps) {
    const { user } = useAuth();
    const [currentPrice, setCurrentPrice] = useState(initialPrice);
    const [bids, setBids] = useState<BidWithBidder[]>(initialBids);
    const [bidAmount, setBidAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const minBid = currentPrice + minIncrement;
    const isExpired = new Date(endsAt).getTime() <= Date.now();
    const isSeller = user?.id === sellerId;

    // Realtime: prepend incoming bids to the list and update price
    const handleNewBid = useCallback((bid: BidWithBidder) => {
        setBids((prev) => [bid, ...prev]);
        setCurrentPrice(bid.amount);
    }, []);

    useRealtimeBids({ auctionId, onNewBid: handleNewBid });

    // Prefill with min bid on mount / price change
    useEffect(() => {
        setBidAmount(minBid.toFixed(2));
    }, [minBid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!user) return setMessage({ type: 'error', text: 'Log in to place a bid' });
        if (isSeller) return setMessage({ type: 'error', text: 'You cannot bid on your own listing' });

        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount < minBid) {
            return setMessage({ type: 'error', text: `Minimum bid is ₵${minBid.toFixed(2)}` });
        }

        setLoading(true);
        const res = await fetch('/api/bids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auction_id: auctionId, amount }),
        });
        const json = await res.json();
        setLoading(false);

        if (!res.ok || json.error) {
            setMessage({ type: 'error', text: json.error ?? 'Failed to place bid' });
        } else {
            setMessage({ type: 'success', text: `Bid of ₵${amount.toFixed(2)} placed!` });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400">Current price</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ₵{currentPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">{bids.length} bid{bids.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Countdown */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Ends in</span>
                    <CountdownTimer endsAt={endsAt} compact />
                </div>
            </div>

            {/* Bid form */}
            {!isExpired && !isSeller && (
                <form onSubmit={handleSubmit} className="p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₵</span>
                            <input
                                type="number"
                                min={minBid}
                                step="0.01"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            {loading ? '…' : 'Bid'}
                        </button>
                    </div>

                    <p className="text-xs text-gray-400">
                        Min. bid: <span className="font-medium text-gray-600 dark:text-gray-300">₵{minBid.toFixed(2)}</span>
                    </p>

                    {message && (
                        <div
                            className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                }`}
                        >
                            {message.text}
                        </div>
                    )}
                </form>
            )}

            {isExpired && (
                <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    This auction has ended.
                </div>
            )}

            {isSeller && !isExpired && (
                <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    You can&apos;t bid on your own listing.
                </div>
            )}

            {/* Bid history */}
            {bids.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Recent bids
                    </p>
                    <ul className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                        {bids.slice(0, 8).map((bid, i) => (
                            <li
                                key={bid.id}
                                className={`flex items-center gap-3 px-4 py-2.5 ${i === 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                                    }`}
                            >
                                <Avatar
                                    src={bid.profiles?.avatar_url}
                                    name={bid.profiles?.username ?? '?'}
                                    size="sm"
                                />
                                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {bid.profiles?.username ?? 'Bidder'}
                                    {i === 0 && (
                                        <span className="ml-1.5 text-[10px] font-bold text-emerald-600 uppercase">Highest</span>
                                    )}
                                </span>
                                <span className={`text-sm font-bold tabular-nums ${i === 0 ? 'text-emerald-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                    ₵{bid.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { Gavel, Trophy, Clock, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface BuyerStats {
    totalBids: number;
    auctionsWon: number;
    activeAuctions: number;
    totalSpent: number;
}

interface BidRow {
    id: string;
    amount: number;
    created_at: string;
    auctions: {
        id: string;
        title: string;
        status: string;
        ends_at: string;
        current_price: number;
        winner_id: string | null;
    } | null;
}

export default function BuyerStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState<BuyerStats>({
        totalBids: 0,
        auctionsWon: 0,
        activeAuctions: 0,
        totalSpent: 0,
    });
    const [recentBids, setRecentBids] = useState<BidRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            const supabase = createClient();

            // Fetch all bids by this user with auction info
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('bids') as any)
                .select(`
                    id, amount, created_at,
                    auctions ( id, title, status, ends_at, current_price, winner_id )
                `)
                .eq('bidder_id', user.id)
                .order('created_at', { ascending: false });

            const bids = (data ?? []) as BidRow[];
            setRecentBids(bids.slice(0, 8));

            // Compute stats
            const uniqueAuctionIds = new Set(bids.map((b) => b.auctions?.id).filter(Boolean));
            const won = bids.filter(
                (b) => b.auctions?.winner_id === user.id && b.auctions?.status === 'sold'
            );
            const active = bids.filter((b) => b.auctions?.status === 'active');
            const uniqueActive = new Set(active.map((b) => b.auctions?.id));
            const totalSpent = won.reduce((sum, b) => sum + (b.auctions?.current_price ?? 0), 0);

            setStats({
                totalBids: bids.length,
                auctionsWon: won.length,
                activeAuctions: uniqueActive.size,
                totalSpent,
            });
            setLoading(false);

            void uniqueAuctionIds; // referenced for correctness
        };

        fetchData();
    }, [user]);

    const statCards = [
        { label: 'Total Bids', value: stats.totalBids.toString(), icon: Gavel },
        { label: 'Auctions Won', value: stats.auctionsWon.toString(), icon: Trophy },
        { label: 'Active Bids', value: stats.activeAuctions.toString(), icon: Clock },
        { label: 'Total Spent', value: formatCurrency(stats.totalSpent), icon: TrendingDown },
    ];

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Stat Cards */}
            <div className="border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
                    {statCards.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-white p-5 sm:p-6">
                            <Icon className="h-4 w-4 text-gray-400 mb-4" strokeWidth={1.5} />
                            <p className="text-2xl sm:text-3xl font-black text-black tracking-tight mb-1">
                                {loading ? <span className="inline-block w-12 h-7 bg-gray-100 animate-pulse" /> : value}
                            </p>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Bids */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-black text-black uppercase tracking-widest">Recent Bids</h2>
                    <Link
                        href="/auctions"
                        className="text-xs font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                    >
                        Browse more
                    </Link>
                </div>

                <div className="border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="divide-y divide-gray-100">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-4 sm:px-5 py-4">
                                    <div className="flex-1 h-4 bg-gray-100 animate-pulse" />
                                    <div className="w-20 h-4 bg-gray-100 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : recentBids.length === 0 ? (
                        <div className="text-center py-14 px-4">
                            <Gavel className="h-7 w-7 text-gray-200 mx-auto mb-3" strokeWidth={1} />
                            <p className="text-sm font-semibold text-black mb-1">No bids yet</p>
                            <p className="text-xs text-gray-400 mb-5">
                                Find an auction and place your first bid.
                            </p>
                            <Link
                                href="/auctions"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                            >
                                Browse Auctions
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {recentBids.map((bid) => {
                                const isWinner = bid.auctions?.winner_id === user?.id;
                                const status = bid.auctions?.status;
                                let badge = '';
                                let badgeColor = '';
                                if (status === 'sold' && isWinner) { badge = 'WON'; badgeColor = 'text-black bg-black/10'; }
                                else if (status === 'sold') { badge = 'OUTBID'; badgeColor = 'text-red-500 bg-red-50'; }
                                else if (status === 'active') { badge = 'ACTIVE'; badgeColor = 'text-gray-600 bg-gray-100'; }
                                else { badge = 'ENDED'; badgeColor = 'text-gray-400 bg-gray-50'; }

                                return (
                                    <Link
                                        key={bid.id}
                                        href={`/auctions/${bid.auctions?.id}`}
                                        className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-black truncate group-hover:underline underline-offset-2">
                                                {bid.auctions?.title ?? 'Auction'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Your bid: <span className="font-mono font-semibold text-black">{formatCurrency(bid.amount)}</span>
                                            </p>
                                        </div>
                                        <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 ${badgeColor}`}>
                                            {badge}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

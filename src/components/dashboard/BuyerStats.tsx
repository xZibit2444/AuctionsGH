'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { Gavel, Trophy, Clock, TrendingDown, MessageCircle } from 'lucide-react';
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
        orders: { id: string; status: string }[] | null;
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('bids') as any)
                .select(`
                    id, amount, created_at,
                    auctions ( id, title, status, ends_at, current_price, winner_id, orders(id, status) )
                `)
                .eq('bidder_id', user.id)
                .order('created_at', { ascending: false })
                .limit(200);

            const bidsRaw = (data ?? []) as BidRow[];

            // Deduplicate: keep only the latest (highest) bid per auction
            const seenAuctions = new Set<string>();
            const uniqueBids = bidsRaw.filter((b) => {
                const aId = b.auctions?.id;
                if (!aId || seenAuctions.has(aId)) return false;
                seenAuctions.add(aId);
                return true;
            });

            // Filter out auctions that are neither active nor won — keep ended/outbid for 2 hours
            const now = new Date();
            const bids = uniqueBids.filter((b) => {
                const auction = b.auctions;
                if (!auction) return false;
                if (auction.status === 'active') return true;
                if (auction.winner_id === user.id && auction.status === 'sold') return true;
                const diffHours = (now.getTime() - new Date(auction.ends_at).getTime()) / (1000 * 60 * 60);
                return diffHours <= 2;
            });

            // Separate won deals so they always appear first in the list
            const wonBids = bids.filter(
                (b) => b.auctions?.winner_id === user.id && b.auctions?.status === 'sold'
            );
            const otherBids = bids.filter(
                (b) => !(b.auctions?.winner_id === user.id && b.auctions?.status === 'sold')
            );

            setRecentBids([...wonBids, ...otherBids].slice(0, 10));

            const uniqueActive = new Set(
                bids.filter((b) => b.auctions?.status === 'active').map((b) => b.auctions?.id)
            );
            const totalSpent = wonBids.reduce((sum, b) => sum + (b.auctions?.current_price ?? 0), 0);

            setStats({
                totalBids: bidsRaw.length,
                auctionsWon: wonBids.length,
                activeAuctions: uniqueActive.size,
                totalSpent,
            });
            setLoading(false);
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
                                const ordersRaw = bid.auctions?.orders;
                                const order = Array.isArray(ordersRaw) ? ordersRaw[0] : ordersRaw ?? null;

                                // 30 mins deadline: ends_at + 30 mins
                                const endsAt = bid.auctions?.ends_at ? new Date(bid.auctions.ends_at).getTime() : 0;
                                const isExpired = endsAt > 0 && (Date.now() - endsAt > 30 * 60 * 1000);

                                let badge = '';
                                let badgeColor = '';
                                if (status === 'sold' && isWinner) { badge = 'WON'; badgeColor = 'text-black bg-black/10'; }
                                else if (status === 'sold') { badge = 'OUTBID'; badgeColor = 'text-red-500 bg-red-50'; }
                                else if (status === 'active') { badge = 'ACTIVE'; badgeColor = 'text-gray-600 bg-gray-100'; }
                                else { badge = 'ENDED'; badgeColor = 'text-gray-400 bg-gray-50'; }

                                return (
                                    <div
                                        key={bid.id}
                                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-3.5 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0"
                                    >
                                        <Link href={`/auctions/${bid.auctions?.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-black truncate group-hover:underline underline-offset-2">
                                                    {bid.auctions?.title ?? 'Auction'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Your bid: <span className="font-mono font-semibold text-black">{formatCurrency(bid.amount)}</span>
                                                </p>
                                            </div>
                                        </Link>

                                        <div className="flex items-center gap-3 shrink-0 mt-1 sm:mt-0">
                                            {order && order.status !== 'void' ? (
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/orders/${order.id}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                                                    >
                                                        Order
                                                    </Link>
                                                    <Link
                                                        href={`/orders/${order.id}#chat`}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                        Chat
                                                    </Link>
                                                </div>
                                            ) : order?.status === 'void' || (status === 'sold' && isWinner && isExpired) ? (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 text-red-600 bg-red-50">
                                                    VOID
                                                </span>
                                            ) : status === 'sold' && isWinner ? (
                                                <Link
                                                    href={`/checkout/${bid.auctions?.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition-colors"
                                                >
                                                    Confirm Order
                                                </Link>
                                            ) : (
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 ${badgeColor}`}>
                                                    {badge}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

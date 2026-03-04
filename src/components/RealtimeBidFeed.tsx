'use client';

/**
 * RealtimeBidFeed
 *
 * A standalone Next.js component that:
 *  1. Fetches existing bid history on mount (server-side initial data optional).
 *  2. Opens a Supabase Realtime channel that listens for INSERT events on the
 *     `bids` table, filtered to a single auction.
 *  3. On each new bid:
 *     - prepends the bid to the history list
 *     - updates the displayed current price
 *     - re-renders with NO page reload (pure React state update)
 *  4. Cleans up the channel subscription when unmounted.
 *
 * Usage:
 *   <RealtimeBidFeed auctionId="..." initialPrice={500} />
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bidder {
    id: string;
    username: string;
    avatar_url: string | null;
}

interface Bid {
    id: string;
    auction_id: string;
    bidder_id: string;
    amount: number;
    created_at: string;
    profiles: Bidder | null;
}

interface RealtimeBidFeedProps {
    auctionId: string;
    initialPrice: number;
    /** Pre-fetched bids from the server (e.g. from a Server Component) */
    initialBids?: Bid[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function ghsCurrency(n: number): string {
    return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RealtimeBidFeed({
    auctionId,
    initialPrice,
    initialBids = [],
}: RealtimeBidFeedProps) {
    const [bids, setBids] = useState<Bid[]>(initialBids);
    const [currentPrice, setCurrentPrice] = useState(initialPrice);
    const [loading, setLoading] = useState(initialBids.length === 0);
    const [connected, setConnected] = useState(false);

    // ── Step 1: Fetch existing bids on mount ────────────────────────────────────
    useEffect(() => {
        if (initialBids.length > 0) {
            setLoading(false);
            return;
        }

        const supabase = createClient();
        supabase
            .from('bids')
            .select('*, profiles(id, username, avatar_url)')
            .eq('auction_id', auctionId)
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data }) => {
                const rows = (data ?? []) as Bid[];
                setBids(rows);
                if (rows[0]) setCurrentPrice(rows[0].amount);
                setLoading(false);
            });
    }, [auctionId, initialBids]);

    // ── Step 2: Handle incoming realtime bid ────────────────────────────────────
    const handleNewBid = useCallback(async (rawBid: Record<string, unknown>) => {
        const supabase = createClient();

        // Fetch the full bid record including the bidder's profile
        const { data } = await supabase
            .from('bids')
            .select('*, profiles(id, username, avatar_url)')
            .eq('id', rawBid.id as string)
            .single();

        if (!data) return;

        const bid = data as Bid;

        // Update current price (highest bid)
        setCurrentPrice(bid.amount);

        // Prepend to bid history — React re-renders automatically, no page reload
        setBids((prev) => [bid, ...prev]);
    }, []);

    // ── Step 3: Subscribe to Supabase Realtime ──────────────────────────────────
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`bids:${auctionId}`)
            // Listen for INSERT events on `bids` filtered by auction_id
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bids',
                    filter: `auction_id=eq.${auctionId}`,
                },
                (payload) => {
                    handleNewBid(payload.new);
                }
            )
            .subscribe((status) => {
                setConnected(status === 'SUBSCRIBED');
            });

        // ── Step 4: Cleanup on unmount ──────────────────────────────────────────
        return () => {
            supabase.removeChannel(channel);
            setConnected(false);
        };
    }, [auctionId, handleNewBid]);

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Header: current price + live indicator */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Current Bid</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                        {ghsCurrency(currentPrice)}
                    </p>
                </div>
                {/* Live indicator dot */}
                <div className="flex items-center gap-2">
                    <span
                        className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                            }`}
                    />
                    <span className="text-xs text-gray-400">
                        {connected ? 'Live' : 'Connecting…'}
                    </span>
                </div>
            </div>

            {/* Bid history list */}
            <div>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Bid History ({bids.length})
                </p>

                {loading && (
                    <div className="space-y-3 px-4 py-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="h-2 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
                                </div>
                                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && bids.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-gray-400">
                        No bids yet — be the first!
                    </p>
                )}

                {!loading && bids.length > 0 && (
                    <ul className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto">
                        {bids.map((bid, i) => (
                            <li
                                key={bid.id}
                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${i === 0
                                    ? 'bg-emerald-50/60 dark:bg-emerald-900/10'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                    }`}
                            >
                                {/* Avatar */}
                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                                    {bid.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                                </div>

                                {/* Username + timestamp */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {bid.profiles?.username ?? 'Bidder'}
                                        {i === 0 && (
                                            <span className="ml-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                                                Highest
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">{timeAgo(bid.created_at)}</p>
                                </div>

                                {/* Amount */}
                                <p
                                    className={`text-sm font-bold tabular-nums shrink-0 ${i === 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {ghsCurrency(bid.amount)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

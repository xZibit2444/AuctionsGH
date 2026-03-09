'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import AuctionCard from '@/components/auction/AuctionCard';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import type { Auction } from '@/types/auction';

type SavedAuction = Auction & { auction_images?: { url: string; position: number }[] };

export default function SavedPage() {
    const { user } = useAuth();
    const [auctions, setAuctions] = useState<SavedAuction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchSaved = async () => {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('saved_auctions') as any)
                .select(`
                    auction_id,
                    auctions (
                        *,
                        auction_images ( url, position )
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const items = (data ?? [])
                .map((row: { auctions: SavedAuction | null }) => row.auctions)
                .filter(Boolean) as SavedAuction[];

            setAuctions(items);
            setLoading(false);
        };

        fetchSaved();
    }, [user]);

    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                            Saved
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">Auctions you&apos;ve liked</p>
                    </div>
                    <Link
                        href="/auctions"
                        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                    >
                        Browse more
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white aspect-[3/4] skeleton-pulse" />
                        ))}
                    </div>
                ) : auctions.length === 0 ? (
                    <div className="text-center py-20 border border-gray-200">
                        <Heart className="h-8 w-8 text-gray-200 mx-auto mb-4" strokeWidth={1} />
                        <p className="text-sm font-semibold text-black mb-1">No saved auctions yet</p>
                        <p className="text-xs text-gray-400 mb-6">
                            Tap the heart on any listing to save it here.
                        </p>
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                        >
                            Browse Auctions
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
                        {auctions.map((auction) => (
                            <div key={auction.id} className="bg-transparent">
                                <AuctionCard auction={auction} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

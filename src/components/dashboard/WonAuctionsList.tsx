'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import Skeleton from '@/components/ui/Skeleton';
import type { Auction } from '@/types/auction';

export default function WonAuctionsList() {
    const { user } = useAuth();
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchWon = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('auctions')
                .select('*, profiles!auctions_seller_id_fkey(username, phone_number, location)')
                .eq('winner_id', user.id)
                .eq('status', 'sold')
                .order('updated_at', { ascending: false });

            setAuctions((data as Auction[]) ?? []);
            setLoading(false);
        };

        fetchWon();
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                ))}
            </div>
        );
    }

    if (auctions.length === 0) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🏆</span>
                <p className="text-gray-500 dark:text-gray-400">
                    You haven&apos;t won any auctions yet.
                </p>
                <Link
                    href="/auctions"
                    className="text-emerald-600 font-medium hover:underline mt-2 inline-block"
                >
                    Browse auctions →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {auctions.map((auction) => (
                <Link
                    key={auction.id}
                    href={`/auctions/${auction.id}`}
                    className="block p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:shadow-emerald-600/10 hover:border-emerald-200 transition-all duration-300 hover:-translate-y-0.5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                                {auction.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Won for {formatCurrency(auction.current_price)}
                            </p>
                        </div>
                        <span className="text-2xl">🏆</span>
                    </div>
                </Link>
            ))}
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuctions } from '@/hooks/useAuctions';
import { formatCurrency } from '@/lib/utils';
import AuctionStatusBadge from '@/components/auction/AuctionStatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import { ArrowUpRight } from 'lucide-react';

export default function ListingTable() {
    const { user } = useAuth();
    const { auctions, loading } = useAuctions({
        sellerId: user?.id,
        status: undefined as unknown as 'active',
        orderBy: 'created_at',
        ascending: false,
        limit: 50,
    });

    if (loading) {
        return (
            <div className="divide-y divide-gray-100">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4">
                        <Skeleton className="h-5 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (auctions.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <p className="text-sm text-gray-400 mb-4">
                    You haven&apos;t created any listings yet.
                </p>
                <Link
                    href="/auctions/create"
                    className="inline-flex items-center gap-1 text-sm font-bold text-black underline underline-offset-4"
                >
                    Create your first listing
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing</th>
                        <th className="text-left py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                        <th className="text-right py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                        <th className="text-right py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Bids</th>
                        <th className="py-3 px-5 hidden sm:table-cell" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {auctions.map((auction) => (
                        <tr
                            key={auction.id}
                            className="hover:bg-gray-50 transition-colors group"
                        >
                            <td className="py-4 px-5">
                                <Link
                                    href={`/auctions/${auction.id}`}
                                    className="font-semibold text-black hover:underline underline-offset-2 line-clamp-1"
                                >
                                    {auction.title}
                                </Link>
                                <span className="sm:hidden block mt-1.5">
                                    <AuctionStatusBadge status={auction.status} />
                                </span>
                            </td>
                            <td className="py-4 px-5 hidden sm:table-cell">
                                <AuctionStatusBadge status={auction.status} />
                            </td>
                            <td className="py-4 px-5 text-right font-black text-black font-mono">
                                {formatCurrency(auction.current_price)}
                            </td>
                            <td className="py-4 px-5 text-right text-gray-500 hidden sm:table-cell font-mono">
                                {auction.bid_count}
                            </td>
                            <td className="py-4 px-5 hidden sm:table-cell text-right">
                                <Link href={`/auctions/${auction.id}`}>
                                    <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-black transition-colors ml-auto" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

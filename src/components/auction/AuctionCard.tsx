'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Package } from 'lucide-react';
import type { Auction } from '@/types/auction';

interface AuctionCardProps {
    auction: Auction & { auction_images?: { url: string; position: number }[] };
}

export default function AuctionCard({ auction }: AuctionCardProps) {
    const thumbnail = auction.auction_images?.sort(
        (a, b) => a.position - b.position
    )[0];

    return (
        <Link href={`/auctions/${auction.id}`} className="block">
            <article className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                {/* Image */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden m-2 rounded-xl">
                    {thumbnail ? (
                        <img
                            src={thumbnail.url}
                            alt={auction.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="h-10 w-10" strokeWidth={1} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="px-4 pb-4 pt-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                        {auction.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-lg font-black text-black tracking-tight">
                            {formatCurrency(auction.current_price)}
                        </p>
                    </div>
                </div>
            </article>
        </Link>
    );
}

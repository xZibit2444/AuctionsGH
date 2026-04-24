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
            <article className="group bg-white border border-gray-200 overflow-hidden hover:border-black transition-colors duration-200">
                {/* Image */}
                <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
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
                <div className="p-4">
                    <h3 className="font-bold text-black text-sm leading-snug line-clamp-2 mb-3">
                        {auction.title}
                    </h3>
                    <p className="text-lg font-black text-black tracking-tight">
                        {formatCurrency(auction.current_price)}
                    </p>
                </div>
            </article>
        </Link>
    );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CONDITION_LABELS } from '@/lib/constants';
import AuctionCountdown from './AuctionCountdown';
import AuctionStatusBadge from './AuctionStatusBadge';
import { Smartphone, Heart } from 'lucide-react';
import { useSavedAuctions } from '@/hooks/useSavedAuctions';
import type { Auction } from '@/types/auction';

interface AuctionCardProps {
    auction: Auction & { auction_images?: { url: string; position: number }[] };
}

export default function AuctionCard({ auction }: AuctionCardProps) {
    const thumbnail = auction.auction_images?.sort(
        (a, b) => a.position - b.position
    )[0];
    const { savedIds, toggleSave } = useSavedAuctions();
    const isSaved = savedIds.has(auction.id);
    const [savePending, setSavePending] = useState(false);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault(); // Don't navigate to auction
        e.stopPropagation();
        if (savePending) return;
        setSavePending(true);
        await toggleSave(auction.id);
        setSavePending(false);
    };

    return (
        <Link href={`/auctions/${auction.id}`}>
            <article className="group bg-white border border-gray-200 overflow-hidden hover:border-black transition-colors duration-200">
                {/* Image */}
                <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                    {thumbnail ? (
                        <img
                            src={thumbnail.url}
                            alt={auction.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Smartphone className="h-10 w-10" strokeWidth={1} />
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                        <AuctionStatusBadge status={auction.status} />
                    </div>

                    {/* Save / Heart button */}
                    <button
                        onClick={handleSave}
                        className={`absolute top-3 right-3 p-1.5 bg-white border transition-colors ${isSaved ? 'border-black text-black' : 'border-gray-200 text-gray-400 hover:border-black hover:text-black'} ${savePending ? 'opacity-50' : ''}`}
                        aria-label={isSaved ? 'Remove from saved' : 'Save auction'}
                    >
                        <Heart
                            className="h-3.5 w-3.5"
                            fill={isSaved ? 'currentColor' : 'none'}
                            strokeWidth={2}
                        />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <h3 className="font-bold text-black text-sm leading-snug line-clamp-1">
                        {auction.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <span className="border border-gray-200 px-2 py-0.5">{auction.brand}</span>
                        <span className="border border-gray-200 px-2 py-0.5">{CONDITION_LABELS[auction.condition] ?? auction.condition}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Current Bid</p>
                            <p className="text-lg font-black text-black tracking-tight">
                                {formatCurrency(auction.current_price)}
                            </p>
                        </div>

                        {auction.status === 'active' && (
                            <AuctionCountdown endTime={auction.ends_at} compact />
                        )}
                    </div>
                </div>
            </article>
        </Link>
    );
}

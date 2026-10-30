'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { CONDITION_LABELS } from '@/lib/constants';
import { isPermanentListing } from '@/lib/listings';
import { MapPin, Package, Play } from 'lucide-react';
import type { Auction } from '@/types/auction';

interface AuctionCardProps {
    auction: Auction & {
        auction_images?: { url: string; position: number }[];
        listing_videos?: { id: string }[] | null;
    };
}

export default function AuctionCard({ auction }: AuctionCardProps) {
    const thumbnail = auction.auction_images?.sort(
        (a, b) => a.position - b.position
    )[0];
    const hasVideo = (auction.listing_videos ?? []).length > 0;
    const priceLabel = isPermanentListing(auction.ends_at) ? 'Fixed price' : 'Auction';
    const conditionLabel = CONDITION_LABELS[auction.condition] ?? auction.condition;

    return (
        <Link href={`/auctions/${auction.id}`} className="block">
            <article className="group overflow-hidden rounded-[14px] border border-[#E9E6E0] bg-white transition-shadow duration-200 hover:shadow-md">
                {/* Photo */}
                <div className="relative aspect-[4/3] bg-stone-100">
                    {thumbnail ? (
                        <img
                            src={thumbnail.url}
                            alt={auction.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-300">
                            <Package className="h-10 w-10" strokeWidth={1} />
                        </div>
                    )}
                    {conditionLabel && (
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-[#12100C]/80 px-2 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
                            {conditionLabel}
                        </span>
                    )}
                    {hasVideo && (
                        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-bold text-[#12100C]">
                            <Play className="h-3 w-3" strokeWidth={2.5} />
                            Video
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="px-3.5 pb-3.5 pt-3">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-[#191612]">
                        {auction.title}
                    </h3>
                    <p className="mt-1.5 flex items-center gap-1 text-[12.5px] text-[#6E675E]">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                        {auction.listing_city ?? 'Greater Accra'} · {priceLabel}
                    </p>
                    <p className="mt-2 text-[17px] font-extrabold tracking-tight text-black">
                        {formatCurrency(auction.current_price)}
                    </p>
                </div>
            </article>
        </Link>
    );
}

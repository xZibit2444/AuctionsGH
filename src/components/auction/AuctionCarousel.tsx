'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AuctionCard from '@/components/auction/AuctionCard';
import { AuctionCardSkeleton } from '@/components/ui/Skeleton';
import type { Auction } from '@/types/auction';

interface AuctionCarouselProps {
    title: string;
    auctions: Auction[];
    loading?: boolean;
    viewAllHref?: string;
    icon?: React.ReactNode;
}

export default function AuctionCarousel({
    title,
    auctions,
    loading = false,
    viewAllHref = '/auctions',
    icon,
}: AuctionCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.75;
        scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    return (
        <section className="relative group/section">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                    {icon && (
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100">
                            {icon}
                        </span>
                    )}
                    {title}
                </h2>
                <Link
                    href={viewAllHref}
                    className="text-xs font-bold text-amber-600 hover:text-amber-500 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
                >
                    See all →
                </Link>
            </div>

            {/* Scroll container */}
            <div className="relative">
                {/* Left arrow */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center bg-white border border-gray-300 shadow-md hover:bg-gray-50 transition-all opacity-0 group-hover/section:opacity-100 disabled:opacity-0"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-4 w-4 text-black" />
                </button>

                {/* Cards row */}
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="shrink-0 w-44 sm:w-52" style={{ scrollSnapAlign: 'start' }}>
                                <AuctionCardSkeleton />
                            </div>
                        ))
                        : auctions.map((auction) => (
                            <div key={auction.id} className="shrink-0 w-44 sm:w-52" style={{ scrollSnapAlign: 'start' }}>
                                <AuctionCard auction={auction} />
                            </div>
                        ))}
                </div>

                {/* Right arrow */}
                <button
                    onClick={() => scroll('right')}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center bg-white border border-gray-300 shadow-md hover:bg-gray-50 transition-all opacity-0 group-hover/section:opacity-100 disabled:opacity-0"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-4 w-4 text-black" />
                </button>
            </div>
        </section>
    );
}

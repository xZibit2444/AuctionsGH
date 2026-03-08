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
        <section>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <h2 className="flex items-center gap-2.5 text-base font-black text-gray-900 uppercase tracking-wide">
                    {icon && <span>{icon}</span>}
                    {title}
                </h2>
                <Link
                    href={viewAllHref}
                    className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                    View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {/* Scroll area with side arrows */}
            <div className="relative">
                <button
                    onClick={() => scroll('left')}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-gray-400 transition-all"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="shrink-0 w-48 sm:w-56" style={{ scrollSnapAlign: 'start' }}>
                                <AuctionCardSkeleton />
                            </div>
                        ))
                        : auctions.map((auction) => (
                            <div key={auction.id} className="shrink-0 w-48 sm:w-56" style={{ scrollSnapAlign: 'start' }}>
                                <AuctionCard auction={auction} />
                            </div>
                        ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-gray-400 transition-all"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
            </div>
        </section>
    );
}

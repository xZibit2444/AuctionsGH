'use client';

import { useEffect, useRef, useState } from 'react';
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
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        const updateScrollState = () => {
            const { scrollLeft, scrollWidth, clientWidth } = element;
            const maxScrollLeft = scrollWidth - clientWidth;
            setCanScrollLeft(scrollLeft > 8);
            setCanScrollRight(maxScrollLeft - scrollLeft > 8);
        };

        updateScrollState();
        element.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            element.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [auctions.length, loading]);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = Math.max(scrollRef.current.clientWidth * 0.82, 240);
        scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
    };

    return (
        <section>
            {/* Section header */}
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-zinc-800">
                <h2 className="flex items-center gap-2.5 text-base font-black uppercase tracking-wide text-gray-900 dark:text-white">
                    {icon && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100 ring-1 ring-gray-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            {icon}
                        </span>
                    )}
                    {title}
                </h2>
                <div className="flex items-center gap-2">
                    <div className="hidden items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex">
                        <button
                            onClick={() => scroll('left')}
                            disabled={!canScrollLeft}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            disabled={!canScrollRight}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-35 dark:text-gray-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <Link
                        href={viewAllHref}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
                    >
                        View all <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>

            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r from-white via-white/85 to-transparent dark:from-black dark:via-black/80 sm:block" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l from-white via-white/85 to-transparent dark:from-black dark:via-black/80 sm:block" />

                <button
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                    className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg shadow-black/10 backdrop-blur transition-all hover:scale-[1.02] hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-0 sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-gray-200 dark:hover:border-zinc-700 dark:hover:text-white"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide sm:px-0"
                    style={{ scrollSnapType: 'x mandatory', scrollPaddingInline: '0.25rem' }}
                >
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-[78vw] shrink-0 sm:w-56" style={{ scrollSnapAlign: 'start' }}>
                                <AuctionCardSkeleton />
                            </div>
                        ))
                        : auctions.map((auction) => (
                            <div key={auction.id} className="w-[78vw] shrink-0 sm:w-56" style={{ scrollSnapAlign: 'start' }}>
                                <AuctionCard auction={auction} />
                            </div>
                        ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    disabled={!canScrollRight}
                    className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg shadow-black/10 backdrop-blur transition-all hover:scale-[1.02] hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-0 sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-gray-200 dark:hover:border-zinc-700 dark:hover:text-white"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </section>
    );
}

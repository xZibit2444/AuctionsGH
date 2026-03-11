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
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-zinc-800">
                <h2 className="flex items-center gap-2.5 text-base font-black uppercase tracking-wide text-gray-900 dark:text-white">
                    {icon && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-900">
                            {icon}
                        </span>
                    )}
                    {title}
                </h2>
                <div className="flex items-center gap-1">
                    <div className="hidden items-center sm:flex">
                        <button
                            onClick={() => scroll('left')}
                            disabled={!canScrollLeft}
                            className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-25 dark:text-gray-500 dark:hover:text-white"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            disabled={!canScrollRight}
                            className="flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-25 dark:text-gray-500 dark:hover:text-white"
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative">
                <button
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                    className="absolute left-0 top-1/2 z-20 flex h-10 w-8 -translate-y-1/2 items-center justify-center text-gray-400 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-0 sm:hidden dark:text-gray-500 dark:hover:text-white"
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
                    className="absolute right-0 top-1/2 z-20 flex h-10 w-8 -translate-y-1/2 items-center justify-center text-gray-400 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-0 sm:hidden dark:text-gray-500 dark:hover:text-white"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-4 flex justify-end">
                <Link
                    href={viewAllHref}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-zinc-800 dark:text-gray-200 dark:hover:border-zinc-700 dark:hover:text-white"
                >
                    Browse more
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </div>
        </section>
    );
}

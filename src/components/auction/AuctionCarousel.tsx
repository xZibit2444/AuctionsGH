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
        <section className="rounded-[2rem] border border-stone-200/80 bg-white/90 px-4 py-5 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] sm:px-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-stone-200 pb-4">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-3 text-lg font-black tracking-tight text-stone-950">
                        {icon && (
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_100%)] text-stone-900 shadow-sm">
                                {icon}
                            </span>
                        )}
                        <span className="truncate">{title}</span>
                    </h2>
                    <p className="mt-1 pl-14 text-xs font-medium text-stone-500">
                        {loading ? 'Loading listings' : `${auctions.length} listings to explore`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600 sm:inline-flex">
                        {loading ? '...' : `${auctions.length} live`}
                    </span>
                    <div className="hidden items-center sm:flex">
                        <button
                            onClick={() => scroll('left')}
                            disabled={!canScrollLeft}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            disabled={!canScrollRight}
                            className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-30"
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
                    className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-600 shadow-sm backdrop-blur transition hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-0 sm:hidden"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto px-1 pb-3 scrollbar-hide sm:px-0"
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
                    className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-600 shadow-sm backdrop-blur transition hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-0 sm:hidden"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-4 flex justify-end">
                <Link
                    href={viewAllHref}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
                >
                    Browse more
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </div>
        </section>
    );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
    {
        id: 1,
        title: "Bid. Win. Own.",
        subtitle: "Live auctions — updated every second",
        cta: "Shop Now",
        href: "/auctions",
        bg: "from-black to-gray-800",
        accent: "text-amber-400",
    },
    {
        id: 2,
        title: "Phones at Unbeatable Prices",
        subtitle: "Verified sellers, real deals across Ghana",
        cta: "Browse Phones",
        href: "/auctions?brand=Phones+%26+Tablets",
        bg: "from-gray-900 to-gray-700",
        accent: "text-amber-300",
    },
    {
        id: 3,
        title: "Sell Faster on AuctionsGH",
        subtitle: "List in minutes. Reach thousands of buyers.",
        cta: "Start Selling",
        href: "/seller-apply",
        bg: "from-zinc-900 to-zinc-700",
        accent: "text-yellow-300",
    },
];

export default function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [animating, setAnimating] = useState(false);

    const goTo = useCallback((idx: number) => {
        if (animating) return;
        setAnimating(true);
        setTimeout(() => {
            setCurrent(idx);
            setAnimating(false);
        }, 300);
    }, [animating]);

    const prev = () => goTo((current - 1 + slides.length) % slides.length);
    const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);

    // Auto-advance every 5s
    useEffect(() => {
        const t = setInterval(next, 5000);
        return () => clearInterval(t);
    }, [next]);

    const slide = slides[current];

    return (
        <div className={`relative w-full rounded-none sm:rounded-lg overflow-hidden bg-linear-to-r ${slide.bg} transition-all duration-500`}>
            <div
                className={`flex flex-col justify-center px-8 sm:px-16 py-14 sm:py-20 min-h-55 sm:min-h-75 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}
            >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${slide.accent} mb-3`}>
                    AuctionsGH — Ghana&apos;s #1 Auction Marketplace
                </p>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-tight mb-3">
                    {slide.title}
                </h2>
                <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-md">
                    {slide.subtitle}
                </p>
                <Link
                    href={slide.href}
                    className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm px-6 py-3 transition-colors w-fit"
                >
                    {slide.cta}
                </Link>
            </div>

            {/* Arrows */}
            <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors"
                aria-label="Previous slide"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors"
                aria-label="Next slide"
            >
                <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/40'}`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

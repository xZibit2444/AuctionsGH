'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
    {
        id: 1,
        tag: 'Welcome to AuctionsGH',
        title: "Ghana's Best\nOnline Auctions",
        subtitle: 'Browse, bid, and win — real deals from verified sellers every day.',
        cta: 'Start Bidding',
        href: '/auctions',
        bg: 'from-amber-500 to-orange-500',
    },
    {
        id: 2,
        tag: 'Phones & Electronics',
        title: 'Latest Phones.\nUnbeatable Prices.',
        subtitle: 'Bid on brand-new and like-new phones from sellers across Ghana.',
        cta: 'Browse Phones',
        href: '/auctions',
        bg: 'from-violet-600 to-indigo-700',
    },
    {
        id: 3,
        tag: 'Become a Seller',
        title: 'Turn Your Items\nInto Cash',
        subtitle: 'List in under 5 minutes. Thousands of buyers are waiting.',
        cta: 'Sell on AuctionsGH',
        href: '/seller-apply',
        bg: 'from-emerald-500 to-teal-600',
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
        <div className={`relative w-full rounded-2xl overflow-hidden bg-linear-to-br ${slide.bg} transition-all duration-500 shadow-lg`}>
            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />

            <div
                className={`relative flex flex-col justify-center px-7 sm:px-16 py-12 sm:py-20 min-h-55 sm:min-h-75 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}
            >
                {/* Live badge + tag */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                    </span>
                    <span className="text-white/70 text-xs font-medium">{slide.tag}</span>
                </div>

                {/* Headline */}
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] whitespace-pre-line mb-3">
                    {slide.title}
                </h2>

                <p className="text-white/80 text-sm sm:text-base mb-6 max-w-sm leading-relaxed">
                    {slide.subtitle}
                </p>

                <Link
                    href={slide.href}
                    className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm px-6 py-3 rounded-full transition-all shadow-md hover:shadow-lg w-fit"
                >
                    {slide.cta} <span>→</span>
                </Link>
            </div>

            {/* Arrows */}
            <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/50 text-white rounded-full transition-colors backdrop-blur-sm"
                aria-label="Previous slide"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
            <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/50 text-white rounded-full transition-colors backdrop-blur-sm"
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
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

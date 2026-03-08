'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

const displayFont = Space_Grotesk({
    subsets: ['latin'],
    weight: ['500', '700'],
});

const slides = [
    {
        id: 1,
        eyebrow: 'Live marketplace',
        title: 'Real listings. Real bidders. No filler.',
        subtitle:
            'Shop active auctions from verified sellers in Accra, with clear condition notes and a proper handover flow.',
        cta: 'Browse live auctions',
        href: '/auctions',
        accent: 'bg-[#c96a18]',
        shell: 'from-[#1c130b] via-[#2d1a0d] to-[#7a3f12]',
        panel: 'bg-[#f4e4d3] text-[#1f140d]',
        stats: ['Phones closing today', 'Meet & inspect payment', 'Seller verification enabled'],
        highlights: [
            { label: 'Now closing', value: '12 lots before 7PM' },
            { label: 'Popular searches', value: 'iPhone, PS5, MacBook' },
            { label: 'Buyer rule', value: 'Inspect before you pay' },
        ],
    },
    {
        id: 2,
        eyebrow: 'Phones and electronics',
        title: 'The good stuff should look worth bidding on.',
        subtitle:
            'Fresh listings for phones, consoles, laptops, and accessories, with room for sharp bidding instead of catalog fluff.',
        cta: 'See electronics',
        href: '/auctions?category=Electronics',
        accent: 'bg-[#2f6fed]',
        shell: 'from-[#07111f] via-[#0f2547] to-[#204a8b]',
        panel: 'bg-[#d9e7ff] text-[#08111f]',
        stats: ['Fast-moving tech lots', 'Image-first listings', 'Short-format auctions'],
        highlights: [
            { label: 'Most watched', value: 'Flagship phones and gaming gear' },
            { label: 'Typical pace', value: 'New bids every few minutes' },
            { label: 'Seller focus', value: 'Detailed condition and accessories' },
        ],
    },
    {
        id: 3,
        eyebrow: 'Sell on AuctionsGH',
        title: 'Turn your shelf stock into actual demand.',
        subtitle:
            'List quickly, reach serious buyers, and manage the handover through one clean order flow instead of endless chat haggling.',
        cta: 'Apply to sell',
        href: '/seller-apply',
        accent: 'bg-[#187b58]',
        shell: 'from-[#081510] via-[#0d2b22] to-[#14513f]',
        panel: 'bg-[#d8f1e7] text-[#0c1b15]',
        stats: ['Simple listing flow', 'Live bidding pressure', 'Order and delivery tracking'],
        highlights: [
            { label: 'Best for', value: 'Phones, accessories, furniture, gear' },
            { label: 'Go live', value: 'List in a few minutes' },
            { label: 'After the win', value: 'Checkout and meetup stay on-platform' },
        ],
    },
];

export default function HeroCarousel() {
    const [current, setCurrent] = useState(0);
    const [animating, setAnimating] = useState(false);

    const goTo = useCallback((idx: number) => {
        if (animating) return;
        setAnimating(true);
        window.setTimeout(() => {
            setCurrent(idx);
            setAnimating(false);
        }, 220);
    }, [animating]);

    const prev = () => goTo((current - 1 + slides.length) % slides.length);
    const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);

    useEffect(() => {
        const timer = window.setInterval(next, 5500);
        return () => window.clearInterval(timer);
    }, [next]);

    const slide = slides[current];

    return (
        <section className={`relative overflow-hidden rounded-[2rem] bg-linear-to-br ${slide.shell} shadow-[0_28px_80px_rgba(15,23,42,0.18)]`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_28%)]" />
            <div className="absolute inset-y-0 right-0 hidden w-[42%] border-l border-white/10 bg-white/5 backdrop-blur-[2px] lg:block" />

            <div
                className={`relative grid min-h-[28rem] gap-8 px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] lg:px-10 transition-all duration-300 ${animating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
            >
                <div className="flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className={`${displayFont.className} inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/92`}>
                                <span className={`h-2 w-2 rounded-full ${slide.accent}`} />
                                {slide.eyebrow}
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                                AuctionsGH
                            </span>
                        </div>

                        <h1 className={`${displayFont.className} mt-6 max-w-3xl text-[2.35rem] font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-5xl lg:text-[4.35rem]`}>
                            {slide.title}
                        </h1>

                        <p className="mt-5 max-w-xl text-sm leading-7 text-white/72 sm:text-[15px]">
                            {slide.subtitle}
                        </p>

                        <div className="mt-7 flex flex-wrap gap-2.5">
                            {slide.stats.map((stat) => (
                                <span
                                    key={stat}
                                    className="rounded-full border border-white/12 bg-black/15 px-3 py-1.5 text-[11px] font-medium tracking-[0.04em] text-white/84"
                                >
                                    {stat}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-3">
                        <Link
                            href={slide.href}
                            className={`${displayFont.className} inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition-transform duration-200 hover:-translate-y-0.5`}
                        >
                            {slide.cta}
                            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                        </Link>
                        <Link
                            href="/faq"
                            className="inline-flex items-center rounded-full border border-white/18 px-4 py-3 text-sm font-medium text-white/82 transition-colors hover:bg-white/8"
                        >
                            How it works
                        </Link>
                    </div>
                </div>

                <div className="flex items-end lg:justify-end">
                    <div className={`w-full max-w-md rounded-[1.75rem] border border-black/5 ${slide.panel} p-5 shadow-[0_18px_45px_rgba(0,0,0,0.14)]`}>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] opacity-55">
                                    What stands out
                                </p>
                                <h2 className={`${displayFont.className} mt-2 text-2xl font-bold tracking-[-0.04em]`}>
                                    Marketplace pulse
                                </h2>
                            </div>
                            <div className="rounded-full bg-black/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                Live
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {slide.highlights.map((item, index) => (
                                <div
                                    key={item.label}
                                    className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl bg-white/58 px-4 py-3"
                                >
                                    <span className={`${displayFont.className} text-lg font-bold opacity-45`}>
                                        0{index + 1}
                                    </span>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45">
                                            {item.label}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold leading-6">
                                            {item.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-2xl bg-black px-4 py-4 text-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                                Buyer note
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/82">
                                If the listing photos, accessories, or condition do not match in person, walk away.
                                AuctionsGH works best when the final handover stays honest.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 flex items-center gap-2 sm:bottom-5 sm:left-5">
                <button
                    onClick={prev}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/18 text-white backdrop-blur-sm transition-colors hover:bg-black/32"
                    aria-label="Previous slide"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={next}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/18 text-white backdrop-blur-sm transition-colors hover:bg-black/32"
                    aria-label="Next slide"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="absolute bottom-5 right-5 flex gap-2">
                {slides.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => goTo(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === current ? 'w-8 bg-white' : 'w-2 bg-white/35'}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}

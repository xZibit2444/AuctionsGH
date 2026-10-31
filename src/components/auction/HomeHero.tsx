'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Auction } from '@/types/auction';
import { isPermanentListing } from '@/lib/listings';

interface HomeHeroProps {
    auctions: (Auction & { auction_images?: { url: string; position: number | null }[] })[];
    loading: boolean;
    /** Total active listings from a real count query; falls back to loaded rows. */
    liveCount?: number | null;
    /** Distinct categories among active listings; omitted when unknown. */
    categoryCount?: number | null;
}

type HeroAuction = HomeHeroProps['auctions'][number];

interface HeroSlide {
    eyebrow: string;
    title: ReactNode;
    sub: ReactNode;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
    stats: ReactNode[];
    photos: string[];
}

const ROTATE_MS = 6000;

function firstPhoto(a: HeroAuction): string | undefined {
    return a.auction_images?.slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))[0]?.url;
}

/** First n unique listing photos from the given listings. */
function fanFrom(list: HeroAuction[], n = 3): string[] {
    const seen = new Set<string>();
    return list
        .map(firstPhoto)
        .filter((u): u is string => typeof u === 'string' && u.length > 0 && !seen.has(u) && !!seen.add(u))
        .slice(0, n);
}

const FAN_IMG_CLASS = 'absolute h-[108px] w-[88px] rounded-[10px] border-[3px] border-[#2A261F] object-cover sm:h-[230px] sm:w-[190px] sm:rounded-[14px] sm:border-4';
const FAN_POS = [
    'left-0 top-[16px] -rotate-[7deg] sm:top-[26px]',
    'left-[51px] top-0 z-10 sm:left-[78px]',
    'left-[102px] top-[18px] rotate-[7deg] sm:left-[152px] sm:top-[30px]',
];

function FanImages({ photos, eagerIndex = 1 }: { photos: string[]; eagerIndex?: number }) {
    return (
        <>
            {photos.map((url, i) => (
                <img
                    key={url}
                    src={url}
                    alt=""
                    loading={i === eagerIndex ? 'eager' : 'lazy'}
                    className={`${FAN_IMG_CLASS} ${FAN_POS[i] ?? FAN_POS[2]}`}
                />
            ))}
        </>
    );
}

/**
 * Storefront banner as a slow auto-rotating carousel. Slide 1 is the original
 * hero (live counts, real listing photos); slides 2-4 explain the marketplace:
 * fixed-price offers, live auctions, and selling. Numbers come from the live
 * listings already loaded for the homepage, so the banner never claims more
 * than the site has. Moves every 6s; pauses on hover/touch, has an explicit
 * pause control, and stays still when the device prefers reduced motion.
 */
export default function HomeHero({ auctions, loading, liveCount, categoryCount }: HomeHeroProps) {
    const shownCount = liveCount ?? auctions.length;
    const hasDelivery = auctions.some((a) => a.delivery_available);

    const allPhotos = fanFrom(auctions);
    const fixedPrice = auctions.filter((a) => isPermanentListing(a.ends_at));
    const timedAuctions = auctions.filter((a) => !isPermanentListing(a.ends_at));
    const fixedPhotos = fanFrom(fixedPrice);
    const auctionPhotos = fanFrom(timedAuctions);
    const sellPhotos = fanFrom(auctions.slice().reverse());

    const slides: HeroSlide[] = [
        {
            eyebrow: 'ACCRA · GHANA',
            title: (
                <>
                    Buy and sell <span className="text-amber-400">anything</span> in Ghana.
                </>
            ),
            sub: (
                <>
                    Phones, furniture, fashion and more, from sellers near you.
                    <span className="hidden sm:inline"> Message the seller, agree how to pay, and collect.</span>
                </>
            ),
            primary: { label: 'Browse listings', href: '/listings' },
            secondary: { label: 'Sell an item', href: '/auctions/create' },
            stats: [
                <span key="count">
                    <b className="font-bold text-white">{loading ? '…' : shownCount}</b> live listings
                </span>,
                ...(categoryCount != null && categoryCount > 0
                    ? [
                        <span key="cats">
                            <b className="font-bold text-white">{categoryCount}</b> categories
                        </span>,
                    ]
                    : []),
                <span key="pickup">Pickup in Accra{hasDelivery ? ' · delivery on many items' : ''}</span>,
            ],
            photos: allPhotos,
        },
        {
            eyebrow: 'FIXED PRICE',
            title: (
                <>
                    See it, like it, <span className="text-amber-400">make an offer</span>.
                </>
            ),
            sub: 'Fixed-price listings take offers. Send the seller your price and chat until you agree.',
            primary: { label: 'Browse fixed price', href: '/listings' },
            secondary: { label: 'How offers work', href: '/faq' },
            stats: [
                <span key="chat">Chat with the seller</span>,
                <span key="insp">Inspection and delivery where the seller offers them</span>,
            ],
            photos: fixedPhotos.length > 0 ? fixedPhotos : allPhotos,
        },
        {
            eyebrow: 'LIVE AUCTIONS',
            title: (
                <>
                    Bid it. Win it. <span className="text-amber-400">It’s yours.</span>
                </>
            ),
            sub: 'Place a bid on any live auction. Win, and confirm your order within 30 minutes.',
            primary: { label: 'See live auctions', href: '/auctions' },
            secondary: { label: 'How bidding works', href: '/faq' },
            stats: [
                <span key="cd">Live countdown on every auction</span>,
                <span key="win">Winners confirm within 30 minutes</span>,
            ],
            photos: auctionPhotos.length > 0 ? auctionPhotos : allPhotos,
        },
        {
            eyebrow: 'SELL ON AUCTIONSGH',
            title: (
                <>
                    Sell it <span className="text-amber-400">your way</span>.
                </>
            ),
            sub: 'Add photos and your price in minutes. Run an auction with an end time, or a permanent fixed-price listing.',
            primary: { label: 'Sell an item', href: '/auctions/create' },
            secondary: { label: 'Browse listings', href: '/listings' },
            stats: [
                <span key="kind">Auction or fixed price</span>,
                <span key="msg">Buyers message you directly</span>,
            ],
            photos: sellPhotos.length > 0 ? sellPhotos : allPhotos,
        },
    ];

    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReducedMotion(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const go = useCallback((next: number) => {
        setIndex(((next % slides.length) + slides.length) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (paused || reducedMotion) return;
        const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
        return () => window.clearInterval(timer);
    }, [paused, reducedMotion, slides.length]);

    return (
        <section
            className="relative overflow-hidden bg-[#12100C]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            aria-roledescription="carousel"
            aria-label="About AuctionsGH"
        >
            <div
                className="flex transition-transform duration-[650ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {slides.map((slide, i) => (
                    <div
                        key={slide.eyebrow}
                        inert={i !== index}
                        className="mx-auto flex w-full min-w-full max-w-7xl flex-col gap-7 px-6 pb-16 pt-9 sm:flex-row sm:items-center sm:gap-10 sm:px-12 sm:pb-[68px] sm:pt-[52px]"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="mb-3.5 text-xs font-extrabold tracking-[0.18em] text-amber-400">
                                {slide.eyebrow}
                            </p>
                            <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px]">
                                {slide.title}
                            </h1>
                            <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-stone-300">
                                {slide.sub}
                            </p>
                            <div className="mt-6 flex gap-3">
                                <Link
                                    href={slide.primary.href}
                                    className="rounded-[10px] bg-amber-400 px-6 py-[13px] text-[15px] font-bold leading-[1.2] text-black transition-colors hover:bg-amber-300"
                                >
                                    {slide.primary.label}
                                </Link>
                                <Link
                                    href={slide.secondary.href}
                                    className="rounded-[10px] border-[1.5px] border-white/85 px-[18px] py-[10px] text-sm font-bold leading-[1.2] text-white transition-colors hover:bg-white/10"
                                >
                                    {slide.secondary.label}
                                </Link>
                            </div>
                            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-400 sm:text-[13px]">
                                {slide.stats}
                            </div>
                        </div>

                        {slide.photos.length > 0 && (
                            i === 0 ? (
                                <div
                                    className="relative h-[140px] w-[190px] shrink-0 sm:h-[280px] sm:w-[340px]"
                                    aria-hidden="true"
                                >
                                    <FanImages photos={slide.photos} />
                                </div>
                            ) : (
                                <div className="relative h-[140px] w-[190px] shrink-0 sm:h-[280px] sm:w-[340px]">
                                    <FanImages photos={slide.photos} />
                                </div>
                            )
                        )}
                    </div>
                ))}
            </div>

            <button
                type="button"
                aria-label="Previous slide"
                onClick={() => go(index - 1)}
                className="absolute left-2.5 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/[0.08] text-xl leading-none text-white transition-colors hover:bg-white/[0.18] sm:flex"
            >
                ‹
            </button>
            <button
                type="button"
                aria-label="Next slide"
                onClick={() => go(index + 1)}
                className="absolute right-2.5 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/[0.08] text-xl leading-none text-white transition-colors hover:bg-white/[0.18] sm:flex"
            >
                ›
            </button>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2" role="tablist" aria-label="Slides">
                {slides.map((slide, i) => (
                    <button
                        key={slide.eyebrow}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Slide ${i + 1}: ${slide.eyebrow.toLowerCase()}`}
                        onClick={() => go(i)}
                        className={`h-2 w-2 rounded-full p-0 transition-colors ${i === index ? 'bg-amber-400' : 'bg-white/35'}`}
                    />
                ))}
            </div>

            <button
                type="button"
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
                className="absolute bottom-2.5 right-3 z-[2] rounded-full border border-white/25 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-white/[0.18]"
            >
                {paused ? '▶ Play' : '❚❚ Pause'}
            </button>

            <div
                key={index}
                className="hero-progress absolute bottom-0 left-0 h-[3px] bg-amber-400"
                style={{
                    animationDuration: `${ROTATE_MS}ms`,
                    animationPlayState: paused || reducedMotion ? 'paused' : 'running',
                }}
            />
        </section>
    );
}

'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Gavel, ShieldCheck } from 'lucide-react';

interface HeroCarouselProps {
    activeCount: number;
    endingSoonCount: number;
    topBidLabel: string;
}

export default function HeroCarousel({
    activeCount,
    endingSoonCount,
    topBidLabel,
}: HeroCarouselProps) {
    return (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-[#071120] via-[#0c1a35] to-[#111827]">
            {/* Subtle dot grid */}
            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            {/* Glow accents */}
            <div className="absolute -top-16 right-24 h-40 w-40 rounded-full bg-amber-400/12 blur-3xl" />
            <div className="absolute -bottom-12 left-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative grid lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
                {/* Left: copy */}
                <div className="flex flex-col justify-center px-6 py-6 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
                    {/* Live badge */}
                    <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/12 bg-white/7 px-3 py-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/65">
                            Live auctions
                        </span>
                    </div>

                    <h1 className="text-[1.55rem] font-extrabold leading-tight tracking-tight text-white sm:text-[2.15rem] lg:text-[2.8rem]">
                        Buy &amp; sell anything from tech to home goods
                        <br className="hidden sm:block" />
                        and everyday resale finds
                        <span className="text-amber-400"> in Accra.</span>
                    </h1>

                    <p className="mt-2.5 max-w-md text-[13px] leading-6 text-white/60 sm:text-sm sm:leading-6">
                        Sellers are vetted before listing. Buyers bid live on electronics, fashion,
                        furniture, collectibles, and more. Meet up, inspect, then pay safely in person.
                    </p>

                    {/* CTAs */}
                    <div className="mt-4 flex flex-wrap gap-2.5">
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-amber-50"
                        >
                            Browse Auctions
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="/faq"
                            className="inline-flex items-center rounded-full border border-white/18 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/8"
                        >
                            How it works
                        </Link>
                    </div>
                </div>
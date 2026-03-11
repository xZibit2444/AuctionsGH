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
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#071120] via-[#0c1a35] to-[#111827]">
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
                <div className="flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-9 lg:px-12 lg:py-10">
                    {/* Live badge */}
                    <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/12 bg-white/7 px-3 py-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/65">
                            Live auctions
                        </span>
                    </div>

                    <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                        Buy &amp; sell phones, laptops
                        <br className="hidden sm:block" />
                        and resale finds
                        <span className="text-amber-400"> in Accra.</span>
                    </h1>

                    <p className="mt-3 max-w-md text-[13px] leading-6 text-white/60 sm:text-sm sm:leading-7">
                        Sellers are vetted before listing. Buyers bid live.
                        Meet up, inspect, then pay — no surprises.
                    </p>

                    {/* CTAs */}
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-50"
                        >
                            Browse Auctions
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="/faq"
                            className="inline-flex items-center rounded-full border border-white/18 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/8"
                        >
                            How it works
                        </Link>
                    </div>

                    {/* Trust tags */}
                    <div className="mt-5 flex flex-wrap gap-2">
                        {['Vetted sellers', 'Live bidding', 'Inspect first'].map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/55"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                            { label: 'Live listings', value: `${activeCount}+` },
                            { label: 'Ending soon', value: `${endingSoonCount}` },
                            { label: 'Top live bid', value: topBidLabel },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                                    {item.label}
                                </p>
                                <p className="mt-2 text-lg font-black tracking-tight text-white">
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: how it works panel */}
                <div className="hidden lg:flex flex-col justify-center border-l border-white/6 bg-black/15 px-6 py-8">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
                        How it works
                    </p>

                    <div className="space-y-2">
                        {[
                            {
                                icon: <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />,
                                title: 'Sellers apply first',
                                desc: 'Every listing is reviewed before going live.',
                            },
                            {
                                icon: <Gavel className="h-3.5 w-3.5 text-amber-300" />,
                                title: 'Bids update live',
                                desc: 'Watch the price move in real time.',
                            },
                            {
                                icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />,
                                title: 'Inspect before paying',
                                desc: 'Meet the seller, check the item, then pay.',
                            },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8">
                                    {icon}
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-white">{title}</p>
                                    <p className="mt-0.5 text-[11px] leading-5 text-white/50">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-2xl bg-amber-400 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-black/50">Buyer tip</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-black/80">
                            If the item doesn&apos;t match the listing, don&apos;t complete the handover.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

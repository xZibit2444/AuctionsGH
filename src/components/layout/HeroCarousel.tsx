'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Gavel, ShieldCheck } from 'lucide-react';

export default function HeroCarousel() {
    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,#20160f_0%,#38281a_45%,#73461f_100%)] shadow-[0_28px_90px_-42px_rgba(68,44,13,0.62)]">
            {/* Subtle dot grid */}
            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />
            {/* Glow accents */}
            <div className="absolute -top-16 right-24 h-44 w-44 rounded-full bg-amber-300/18 blur-3xl" />
            <div className="absolute -bottom-12 left-16 h-36 w-36 rounded-full bg-orange-500/16 blur-3xl" />

            <div className="relative grid lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
                {/* Left: copy */}
                <div className="flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-9 lg:px-12 lg:py-10">
                    {/* Live badge */}
                    <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/14 bg-white/8 px-3 py-1.5 shadow-sm">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/65">
                            Live marketplace
                        </span>
                    </div>

                    <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                        Buy &amp; sell phones, laptops
                        <br className="hidden sm:block" />
                        and standout resale finds
                        <span className="text-amber-300"> in Ghana.</span>
                    </h1>

                    <p className="mt-4 max-w-lg text-[13px] leading-6 text-white/68 sm:text-sm sm:leading-7">
                        Sellers are vetted before listing. Buyers bid live. Meet up, inspect, then pay with more confidence and less marketplace chaos.
                    </p>

                    {/* CTAs */}
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-50 shadow-sm"
                        >
                            Browse Auctions
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                            href="/faq"
                            className="inline-flex items-center rounded-full border border-white/18 px-5 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                        >
                            How it works
                        </Link>
                    </div>

                    {/* Trust tags */}
                    <div className="mt-5 flex flex-wrap gap-2">
                        {['Vetted sellers', 'Live bidding', 'Inspect first'].map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-medium text-white/62"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right: how it works panel */}
                <div className="hidden lg:flex flex-col justify-center border-l border-white/8 bg-black/12 px-6 py-8">
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
                            <div key={title} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 shadow-sm">
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                                    {icon}
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-white">{title}</p>
                                    <p className="mt-0.5 text-[11px] leading-5 text-white/50">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-2xl bg-amber-300 px-4 py-3 shadow-sm">
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

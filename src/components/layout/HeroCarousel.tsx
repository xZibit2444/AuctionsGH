'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, BadgeCheck, Zap } from 'lucide-react';



export default function HeroCarousel() {
    return (
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-gray-950 via-gray-900 to-gray-800">
            {/* Subtle dot grid */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />
            {/* Glow accents */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-500/8 blur-3xl" />

            <div className="relative grid lg:grid-cols-[1fr_auto] min-h-80">
                {/* Left — headline + CTAs */}
                <div className="flex flex-col justify-center px-7 py-10 sm:px-10 sm:py-12 lg:py-14">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 mb-6">
                        <span className="h-2 w-2 rounded-full bg-green-400" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Live auctions open</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.06] tracking-tight text-white">
                        Ghana's auction<br className="hidden sm:block" />
                        <span className="text-amber-400"> marketplace</span>
                    </h1>

                    <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-white/60 max-w-sm">
                        Bid on phones, electronics and more from verified sellers.
                        Clear conditions, secure payments, real handovers.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-2 bg-white text-black font-bold text-sm px-6 py-2.5 rounded-full hover:bg-amber-50 transition-colors"
                        >
                            Browse Auctions
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/seller-apply"
                            className="inline-flex items-center gap-2 border border-white/20 text-white/85 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-white/8 transition-colors"
                        >
                            Start Selling
                        </Link>
                    </div>
                </div>

                {/* Right — feature cards (desktop only) */}
                <div className="hidden lg:flex flex-col justify-center gap-3 border-l border-white/8 bg-white/2 px-8 py-10 min-w-65">
                    {[
                        {
                            icon: <BadgeCheck className="h-5 w-5 text-blue-400" />,
                            title: 'Verified Sellers',
                            desc: 'ID-checked before going live',
                        },
                        {
                            icon: <ShieldCheck className="h-5 w-5 text-green-400" />,
                            title: 'Secure Checkout',
                            desc: 'Buyer protection built in',
                        },
                        {
                            icon: <Zap className="h-5 w-5 text-amber-400" />,
                            title: 'Instant Bidding',
                            desc: 'Real-time, no delays',
                        },
                    ].map(({ icon, title, desc }) => (
                        <div
                            key={title}
                            className="flex items-center gap-3.5 rounded-xl border border-white/8 bg-white/5 px-4 py-3.5"
                        >
                            <div className="shrink-0">{icon}</div>
                            <div>
                                <p className="text-sm font-bold text-white">{title}</p>
                                <p className="text-xs text-white/45 mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

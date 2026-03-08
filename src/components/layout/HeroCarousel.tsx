'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Gavel, ShieldCheck } from 'lucide-react';

export default function HeroCarousel() {
    return (
        <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-[#071120] via-[#0b1730] to-[#111827]">
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />
            <div className="absolute inset-y-0 right-0 hidden w-120 border-l border-white/8 bg-white/3 lg:block" />
            <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative grid min-h-124 lg:grid-cols-[minmax(0,1fr)_26rem]">
                <div className="flex flex-col justify-center px-7 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                    <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5">
                        <span
                            className="h-2 w-2 rounded-full bg-green-400"
                            style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
                        />
                        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/72">
                            Auctions open now
                        </span>
                    </div>

                    <h1 className="max-w-3xl text-3xl font-extrabold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl lg:text-[4.2rem]">
                        Bid on good phones,
                        <br className="hidden sm:block" />
                        laptops, and resale finds
                        <span className="text-amber-400"> around Accra.</span>
                    </h1>

                    <p className="mt-5 max-w-xl text-sm leading-8 text-white/68 sm:text-[15px]">
                        AuctionsGH is built for local resale. Sellers apply before listing,
                        buyers bid live, and the handover stays simple: meet, inspect, then pay.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2.5">
                        {['Seller applications reviewed', 'Condition notes matter', 'Meet-to-inspect handover'].map((item) => (
                            <span
                                key={item}
                                className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[11px] font-medium text-white/78"
                            >
                                {item}
                            </span>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-50"
                        >
                            Browse Auctions
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/faq"
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/8"
                        >
                            How it works
                        </Link>
                    </div>

                    <div className="mt-10 border-t border-white/10 pt-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                            Popular on the marketplace
                        </p>
                        <p className="mt-2 text-sm text-white/72">
                            iPhones, Samsung Galaxy devices, laptops, gaming consoles, speakers, and home appliances.
                        </p>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col justify-center px-8 py-10">
                    <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/48">
                            How AuctionsGH works
                        </p>

                        <div className="mt-5 space-y-3">
                            {[
                                {
                                    icon: <ShieldCheck className="h-4 w-4 text-sky-300" />,
                                    title: 'Sellers apply first',
                                    desc: 'Listings go live only after seller review and approval.',
                                },
                                {
                                    icon: <Gavel className="h-4 w-4 text-amber-300" />,
                                    title: 'Bids update live',
                                    desc: 'You see the current pace of the auction as bids come in.',
                                },
                                {
                                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
                                    title: 'Inspect before payment',
                                    desc: 'The winner checks out on-platform, then meets the seller to inspect.',
                                },
                            ].map(({ icon, title, desc }) => (
                                <div
                                    key={title}
                                    className="rounded-2xl border border-white/8 bg-black/18 px-4 py-4"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8">
                                            {icon}
                                        </div>
                                        <p className="text-sm font-bold text-white">{title}</p>
                                    </div>
                                    <p className="mt-3 pl-[2.85rem] text-[13px] leading-6 text-white/58">
                                        {desc}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-2xl bg-amber-400 px-4 py-4 text-black">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">
                                Buyer reminder
                            </p>
                            <p className="mt-2 text-sm font-medium leading-6">
                                If the condition does not match the listing when you meet up, do not complete the handover.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

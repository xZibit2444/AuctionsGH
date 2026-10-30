'use client';

import Link from 'next/link';
import type { Auction } from '@/types/auction';

interface HomeHeroProps {
    auctions: (Auction & { auction_images?: { url: string; position: number | null }[] })[];
    loading: boolean;
}

/**
 * Storefront banner: what AuctionsGH is, primary actions, and a fan of real
 * listing photos. Numbers come from the live listings already loaded for the
 * homepage, so the banner never claims more than the site has.
 */
export default function HomeHero({ auctions, loading }: HomeHeroProps) {
    const liveCount = auctions.length;
    const hasDelivery = auctions.some((a) => a.delivery_available);
    const seen = new Set<string>();
    const fanPhotos = auctions
        .map((a) => a.auction_images?.slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))[0]?.url)
        .filter((u): u is string => typeof u === 'string' && u.length > 0 && !seen.has(u) && !!seen.add(u))
        .slice(0, 3);

    return (
        <section className="-mx-4 -mt-4 bg-[#12100C] sm:-mx-6 sm:-mt-8 lg:-mx-8">
            <div className="mx-auto flex max-w-7xl items-center gap-10 px-6 py-9 sm:px-10 sm:py-12">
                <div className="min-w-0 flex-1">
                    <p className="mb-3.5 text-xs font-extrabold tracking-[0.18em] text-amber-400">
                        ACCRA · GHANA
                    </p>
                    <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px]">
                        Buy and sell <span className="text-amber-400">anything</span> in Ghana.
                    </h1>
                    <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-stone-300">
                        Phones, furniture, fashion and more, from sellers near you.
                        <span className="hidden sm:inline"> Message the seller, agree how to pay, and collect.</span>
                    </p>
                    <div className="mt-6 flex gap-3">
                        <Link
                            href="/listings"
                            className="rounded-[10px] bg-amber-400 px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-300"
                        >
                            Browse listings
                        </Link>
                        <Link
                            href="/auctions/create"
                            className="rounded-[10px] border-[1.5px] border-white/85 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                        >
                            Sell an item
                        </Link>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-400 sm:text-[13px]">
                        <span>
                            <b className="font-bold text-white">{loading ? '…' : liveCount}</b> live listings
                        </span>
                        <span>Pickup in Accra{hasDelivery ? ' · delivery on many items' : ''}</span>
                    </div>
                </div>

                {fanPhotos.length > 0 && (
                    <div className="relative hidden h-[280px] w-[340px] shrink-0 sm:block" aria-hidden="true">
                        {fanPhotos.map((url, i) => (
                            <img
                                key={url}
                                src={url}
                                alt=""
                                loading={i === 1 ? 'eager' : 'lazy'}
                                className={`absolute h-[230px] w-[190px] rounded-[14px] border-4 border-[#2A261F] object-cover ${i === 0
                                    ? 'left-0 top-[26px] -rotate-[7deg]'
                                    : i === 1
                                        ? 'left-[78px] top-0 z-10'
                                        : 'left-[152px] top-[30px] rotate-[7deg]'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

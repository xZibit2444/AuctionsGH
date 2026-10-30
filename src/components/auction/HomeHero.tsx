'use client';

import Link from 'next/link';
import type { Auction } from '@/types/auction';

interface HomeHeroProps {
    auctions: (Auction & { auction_images?: { url: string; position: number | null }[] })[];
    loading: boolean;
    /** Total active listings from a real count query; falls back to loaded rows. */
    liveCount?: number | null;
    /** Distinct categories among active listings; omitted when unknown. */
    categoryCount?: number | null;
}

/**
 * Storefront banner: what AuctionsGH is, primary actions, and a fan of real
 * listing photos. Numbers come from the live listings already loaded for the
 * homepage, so the banner never claims more than the site has.
 */
export default function HomeHero({ auctions, loading, liveCount, categoryCount }: HomeHeroProps) {
    const shownCount = liveCount ?? auctions.length;
    const hasDelivery = auctions.some((a) => a.delivery_available);
    const seen = new Set<string>();
    const fanPhotos = auctions
        .map((a) => a.auction_images?.slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))[0]?.url)
        .filter((u): u is string => typeof u === 'string' && u.length > 0 && !seen.has(u) && !!seen.add(u))
        .slice(0, 3);

    return (
        <section className="bg-[#12100C]">
            <div className="mx-auto flex max-w-7xl flex-col gap-7 px-6 py-9 sm:flex-row sm:items-center sm:gap-10 sm:px-12 sm:py-[52px]">
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
                            className="rounded-[10px] bg-amber-400 px-6 py-[13px] text-[15px] font-bold leading-[1.2] text-black transition-colors hover:bg-amber-300"
                        >
                            Browse listings
                        </Link>
                        <Link
                            href="/auctions/create"
                            className="rounded-[10px] border-[1.5px] border-white/85 px-[18px] py-[10px] text-sm font-bold leading-[1.2] text-white transition-colors hover:bg-white/10"
                        >
                            Sell an item
                        </Link>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-400 sm:text-[13px]">
                        <span>
                            <b className="font-bold text-white">{loading ? '…' : shownCount}</b> live listings
                        </span>
                        {categoryCount != null && categoryCount > 0 && (
                            <span>
                                <b className="font-bold text-white">{categoryCount}</b> categories
                            </span>
                        )}
                        <span>Pickup in Accra{hasDelivery ? ' · delivery on many items' : ''}</span>
                    </div>
                </div>

                {fanPhotos.length > 0 && (
                    <div
                        className="relative h-[140px] w-[190px] shrink-0 sm:h-[280px] sm:w-[340px]"
                        aria-hidden="true"
                    >
                        {fanPhotos.map((url, i) => (
                            <img
                                key={url}
                                src={url}
                                alt=""
                                loading={i === 1 ? 'eager' : 'lazy'}
                                className={`absolute h-[108px] w-[88px] rounded-[10px] border-[3px] border-[#2A261F] object-cover sm:h-[230px] sm:w-[190px] sm:rounded-[14px] sm:border-4 ${i === 0
                                    ? 'left-0 top-[16px] -rotate-[7deg] sm:top-[26px]'
                                    : i === 1
                                        ? 'left-[51px] top-0 z-10 sm:left-[78px]'
                                        : 'left-[102px] top-[18px] rotate-[7deg] sm:left-[152px] sm:top-[30px]'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

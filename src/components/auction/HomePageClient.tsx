'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import { shuffled } from '@/lib/rotation';
import { createClient } from '@/lib/supabase/client';
import AuctionGrid from '@/components/auction/AuctionGrid';
import HomeHero from '@/components/auction/HomeHero';
import HomeHeader from '@/components/layout/HomeHeader';
import CategoryBar from '@/components/layout/CategoryBar';

interface HomeStats {
    liveCount: number | null;
    categoryCount: number | null;
}

// Homepage shows a compact preview of the listings; the full set lives on
// the Permanent Listings tab (/listings), reached through "See more".
const PREVIEW_COUNT = 6;

export default function HomePageClient() {
    const [search, setSearch] = useState('');
    const [brand, setBrand] = useState('All');
    const [condition] = useState('All');
    const [stats, setStats] = useState<HomeStats>({ liveCount: null, categoryCount: null });

    const { auctions, loading, error } = useAuctions({
        status: 'active',
        search,
        brand,
        condition,
        orderBy: 'ends_at',
        ascending: true,
        limit: 30,
    });

    // Real headline numbers for the hero: total active listings and the
    // number of distinct categories among them (not just the loaded page).
    useEffect(() => {
        let isMounted = true;
        const supabase = createClient();
        const loadStats = async () => {
            const [{ count }, { data: brandRows }] = await Promise.all([
                supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('auctions').select('brand').eq('status', 'active').limit(1000),
            ]);
            if (!isMounted) return;
            const distinct = new Set((brandRows ?? []).map((r: { brand: string | null }) => r.brand).filter(Boolean));
            setStats({
                liveCount: typeof count === 'number' ? count : null,
                categoryCount: distinct.size > 0 ? distinct.size : null,
            });
        };
        loadStats();
        return () => {
            isMounted = false;
        };
    }, []);

    const isFiltering = search !== '' || brand !== 'All';
    // Search and category results stay complete; only the default homepage
    // view is capped at the preview count. The preview pool rotates on every
    // open so returning visitors see different listings first.
    const rotatedPool = useMemo(() => shuffled(auctions), [auctions]);
    const visibleAuctions = isFiltering ? auctions : rotatedPool.slice(0, PREVIEW_COUNT);
    const hasMore = !isFiltering && !loading && auctions.length > PREVIEW_COUNT;

    return (
        <div className="min-h-screen bg-[#F5F4F0]">
            <HomeHeader search={search} setSearch={setSearch} hideLogo />

            <HomeHero
                auctions={auctions}
                loading={loading}
                liveCount={stats.liveCount}
                categoryCount={stats.categoryCount}
            />

            {error && (
                <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-7">
                    <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {error}
                    </div>
                </div>
            )}

            <div className="px-4 pt-4 sm:px-7">
                <CategoryBar selected={brand} onSelect={setBrand} />
            </div>

            <section className="px-4 pb-10 pt-4 sm:px-7 sm:pt-[18px]">
                <div className="mb-3.5 flex items-center gap-2.5 sm:mb-[22px]">
                    <h2 className="text-[17px] font-extrabold leading-[1.15] tracking-tight text-[#191612] sm:text-xl">
                        {isFiltering ? 'Search results' : 'Live now'}
                    </h2>
                    <span className="rounded-full border border-[#E9E6E0] bg-white px-2.5 py-[3px] text-xs font-bold leading-[1.2] text-[#6E675E]">
                        {loading
                            ? '...'
                            : isFiltering
                                ? `${auctions.length} found`
                                : `${stats.liveCount ?? auctions.length} listings`}
                    </span>
                    {hasMore && (
                        <Link
                            href="/listings"
                            className="ml-auto inline-flex items-center gap-1 text-[13px] font-bold text-[#191612] transition-colors hover:text-black sm:text-sm"
                        >
                            See more
                            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                        </Link>
                    )}
                </div>
                <AuctionGrid auctions={visibleAuctions} loading={loading} />
                {hasMore && (
                    <div className="mt-6 flex justify-center sm:mt-8">
                        <Link
                            href="/listings"
                            className="inline-flex items-center gap-2 rounded-[10px] bg-amber-400 px-6 py-[13px] text-[15px] font-bold leading-[1.2] text-black transition-colors hover:bg-amber-300"
                        >
                            See more
                            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}

'use client';

import { useMemo, useState } from 'react';
import { Flame, Zap, Clock, TrendingUp } from 'lucide-react';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';
import AuctionCarousel from '@/components/auction/AuctionCarousel';
import AuctionFilters from '@/components/auction/AuctionFilters';
import CategoryBar from '@/components/layout/CategoryBar';
import HeroCarousel from '@/components/layout/HeroCarousel';
import { formatCurrency } from '@/lib/utils';

export default function HomePageClient() {
    const [search, setSearch] = useState('');
    const [brand, setBrand] = useState('All');
    const [condition, setCondition] = useState('All');
    const [sortBy, setSortBy] = useState<'current_price' | 'ends_at' | 'created_at'>('ends_at');
    const [ascending, setAscending] = useState(true);

    const { auctions, loading, error } = useAuctions({
        status: 'active',
        search,
        brand,
        condition,
        orderBy: sortBy,
        ascending,
        limit: 30,
    });

    const endingSoon = useMemo(() =>
        [...auctions].sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()).slice(0, 20),
    [auctions]);
    const newest = useMemo(() =>
        [...auctions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20),
    [auctions]);
    const topBids = useMemo(() =>
        [...auctions].sort((a, b) => b.current_price - a.current_price).slice(0, 20),
    [auctions]);
    const topBidLabel = topBids[0] ? formatCurrency(topBids[0].current_price) : 'GH₵0.00';

    const isFiltering = search !== '' || brand !== 'All' || condition !== 'All';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8">
            {error && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                </div>
            )}

            <HeroCarousel
                activeCount={auctions.length}
                endingSoonCount={endingSoon.length}
                topBidLabel={topBidLabel}
            />

            <CategoryBar selected={brand} onSelect={setBrand} />

            <AuctionFilters
                search={search}
                setSearch={setSearch}
                brand={brand}
                setBrand={setBrand}
                condition={condition}
                setCondition={setCondition}
                sortBy={sortBy}
                setSortBy={setSortBy}
                ascending={ascending}
                setAscending={setAscending}
            />

            {isFiltering ? (
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100">
                                <Flame className="h-3.5 w-3.5 text-amber-600" />
                            </span>
                            Search Results
                        </h2>
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            {auctions.length} found
                        </span>
                    </div>
                    <AuctionGrid auctions={auctions} loading={loading} />
                </section>
            ) : (
                <>
                    <AuctionCarousel
                        title="Ending Soon"
                        auctions={endingSoon}
                        loading={loading}
                        viewAllHref="/auctions"
                        icon={<Clock className="h-4 w-4 text-orange-500" />}
                    />

                    <AuctionCarousel
                        title="Top Bids"
                        auctions={topBids}
                        loading={loading}
                        viewAllHref="/auctions"
                        icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                    />

                    <AuctionCarousel
                        title="Just Listed"
                        auctions={newest}
                        loading={loading}
                        viewAllHref="/auctions"
                        icon={<Zap className="h-4 w-4 text-blue-500" />}
                    />

                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-100">
                                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                                </span>
                                All Live Auctions
                            </h2>
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                {loading ? '...' : `${auctions.length} active`}
                            </span>
                        </div>
                        <AuctionGrid auctions={auctions} loading={loading} />
                    </section>
                </>
            )}
        </div>
    );
}

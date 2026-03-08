'use client';

import { useState, useMemo } from 'react';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';
import AuctionCarousel from '@/components/auction/AuctionCarousel';
import AuctionFilters from '@/components/auction/AuctionFilters';
import HeroCarousel from '@/components/layout/HeroCarousel';
import CategoryBar from '@/components/layout/CategoryBar';
import { Flame, Zap, Clock, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('All');
  const [condition, setCondition] = useState('All');
  const [sortBy, setSortBy] = useState<'current_price' | 'ends_at' | 'created_at'>('ends_at');
  const [ascending, setAscending] = useState(true);

  // Main filtered results
  const { auctions, loading } = useAuctions({
    status: 'active',
    search,
    brand,
    condition,
    orderBy: sortBy,
    ascending,
    limit: 60,
  });

  // Carousel slices — ending soonest
  const endingSoon = useMemo(() =>
    [...auctions].sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()).slice(0, 20),
    [auctions]
  );

  // Newest listings
  const newest = useMemo(() =>
    [...auctions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20),
    [auctions]
  );

  // Highest bids
  const topBids = useMemo(() =>
    [...auctions].sort((a, b) => b.current_price - a.current_price).slice(0, 20),
    [auctions]
  );

  const isFiltering = search !== '' || brand !== 'All' || condition !== 'All';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10">

      {/* Hero Banner Carousel */}
      <HeroCarousel />

      {/* Category Bar */}
      <CategoryBar selected={brand} onSelect={setBrand} />

      {/* Search / Sort filters (compact) */}
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

      {/* When searching/filtering show grid, otherwise show carousels */}
      {isFiltering ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-black uppercase tracking-tight">
              <Flame className="h-4 w-4" />
              Results
            </h2>
            <span className="text-xs font-mono font-semibold text-gray-400">
              {auctions.length} found
            </span>
          </div>
          <AuctionGrid auctions={auctions} loading={loading} />
        </section>
      ) : (
        <>
          {/* Ending Soon Carousel */}
          <AuctionCarousel
            title="Ending Soon"
            auctions={endingSoon}
            loading={loading}
            viewAllHref="/auctions"
            icon={<Clock className="h-4 w-4 text-amber-500" />}
          />

          {/* Deal divider */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Zap className="h-5 w-5 text-amber-400" />, title: 'Fast Checkout', desc: 'Win and pay in minutes' },
              { icon: <Flame className="h-5 w-5 text-red-500" />, title: 'Verified Sellers', desc: 'All sellers are ID-verified' },
              { icon: <TrendingUp className="h-5 w-5 text-green-500" />, title: 'Live Bidding', desc: 'Real-time price updates' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 border border-gray-200 px-4 py-3 bg-white">
                {icon}
                <div>
                  <p className="text-xs font-black text-black uppercase tracking-wider">{title}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top Bids Carousel */}
          <AuctionCarousel
            title="Top Bids"
            auctions={topBids}
            loading={loading}
            viewAllHref="/auctions"
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          />

          {/* Newest Listings Carousel */}
          <AuctionCarousel
            title="Just Listed"
            auctions={newest}
            loading={loading}
            viewAllHref="/auctions"
            icon={<Zap className="h-4 w-4 text-blue-500" />}
          />

          {/* All Active Auctions Grid */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-black uppercase tracking-tight">
                <Flame className="h-4 w-4 text-orange-500" />
                All Live Auctions
              </h2>
              <span className="text-xs font-mono font-semibold text-gray-400">
                {auctions.length} active
              </span>
            </div>
            <AuctionGrid auctions={auctions} loading={loading} />
          </section>
        </>
      )}
    </div>
  );
}


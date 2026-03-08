'use client';

import { useState, useMemo } from 'react';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';
import AuctionCarousel from '@/components/auction/AuctionCarousel';
import AuctionFilters from '@/components/auction/AuctionFilters';
import HeroCarousel from '@/components/layout/HeroCarousel';
import CategoryBar from '@/components/layout/CategoryBar';
import { Flame, Zap, Clock, TrendingUp, ShieldCheck, BadgeCheck } from 'lucide-react';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('All');
  const [condition, setCondition] = useState('All');
  const [sortBy, setSortBy] = useState<'current_price' | 'ends_at' | 'created_at'>('ends_at');
  const [ascending, setAscending] = useState(true);

  const { auctions, loading } = useAuctions({
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
    [auctions]
  );
  const newest = useMemo(() =>
    [...auctions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20),
    [auctions]
  );
  const topBids = useMemo(() =>
    [...auctions].sort((a, b) => b.current_price - a.current_price).slice(0, 20),
    [auctions]
  );

  const isFiltering = search !== '' || brand !== 'All' || condition !== 'All';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8">

      {/* Hero */}
      <HeroCarousel />

      {/* Category pills */}
      <CategoryBar selected={brand} onSelect={setBrand} />

      {/* Filters */}
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
          {/* Trust strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: <Zap className="h-5 w-5 text-amber-500" />,
                bg: 'bg-amber-50',
                title: 'Instant Checkout',
                desc: 'Win and complete your order in minutes',
              },
              {
                icon: <BadgeCheck className="h-5 w-5 text-blue-500" />,
                bg: 'bg-blue-50',
                title: 'Verified Sellers',
                desc: 'Every seller is ID-verified before listing',
              },
              {
                icon: <ShieldCheck className="h-5 w-5 text-green-500" />,
                bg: 'bg-green-50',
                title: 'Secure Payments',
                desc: 'Safe and reliable payment process',
              },
            ].map(({ icon, bg, title, desc }) => (
              <div key={title} className={`flex items-center gap-4 rounded-2xl ${bg} px-5 py-4`}>
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ending Soon */}
          <AuctionCarousel
            title="Ending Soon"
            auctions={endingSoon}
            loading={loading}
            viewAllHref="/auctions"
            icon={<Clock className="h-4 w-4 text-orange-500" />}
          />

          {/* Top Bids */}
          <AuctionCarousel
            title="Top Bids"
            auctions={topBids}
            loading={loading}
            viewAllHref="/auctions"
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          />

          {/* Just Listed */}
          <AuctionCarousel
            title="Just Listed"
            auctions={newest}
            loading={loading}
            viewAllHref="/auctions"
            icon={<Zap className="h-4 w-4 text-blue-500" />}
          />

          {/* Full grid */}
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


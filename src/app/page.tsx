'use client';

import { useState } from 'react';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';
import AuctionFilters from '@/components/auction/AuctionFilters';
import { Flame } from 'lucide-react';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('All');
  const [condition, setCondition] = useState('All');
  const [minStorage, setMinStorage] = useState(0);
  const [sortBy, setSortBy] = useState<'current_price' | 'ends_at' | 'created_at'>('ends_at');
  const [ascending, setAscending] = useState(true);

  // The hook now handles all the backend querying and sorting
  const { auctions, loading } = useAuctions({
    status: 'active',
    search,
    brand,
    condition,
    minStorage,
    orderBy: sortBy,
    ascending,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Hero */}
      <section className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tighter mb-2">
          Find Your Next Deal.
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl">
          Bid on items from verified sellers across Ghana.
        </p>
      </section>

      {/* Advanced Filters */}
      <AuctionFilters
        search={search}
        setSearch={setSearch}
        brand={brand}
        setBrand={setBrand}
        condition={condition}
        setCondition={setCondition}
        minStorage={minStorage}
        setMinStorage={setMinStorage}
        sortBy={sortBy}
        setSortBy={setSortBy}
        ascending={ascending}
        setAscending={setAscending}
      />

      {/* Live Auctions */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-xl font-black text-black tracking-tight uppercase">
            <Flame className="h-4 w-4" strokeWidth={2} />
            Live Auctions
          </h2>
          <span className="text-sm font-mono font-semibold text-gray-500">
            {auctions.length} active
          </span>
        </div>
        <AuctionGrid auctions={auctions} loading={loading} />
      </section>
    </div>
  );
}

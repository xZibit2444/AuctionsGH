'use client';

import { useState } from 'react';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';
import { PHONE_BRANDS } from '@/lib/constants';
import { Flame } from 'lucide-react';

const ALL = 'All';

export default function HomePage() {
  const [activeBrand, setActiveBrand] = useState<string>(ALL);
  const { auctions, loading } = useAuctions({ status: 'active', orderBy: 'ends_at' });

  const brands = [ALL, ...PHONE_BRANDS.slice(0, 8)];

  const filtered =
    activeBrand === ALL ? auctions : auctions.filter((a) => a.brand === activeBrand);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Hero */}
      <section className="mb-10 sm:mb-14">
        <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tighter mb-2">
          Find Your Next Phone.
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl">
          Bid on premium smartphones from verified sellers across Ghana.
        </p>
      </section>

      {/* Brand Filters */}
      <section className="mb-10 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide select-none">
        <div className="flex gap-2 pb-2">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setActiveBrand(brand)}
              className={
                activeBrand === brand
                  ? 'shrink-0 px-4 py-1.5 bg-black text-white text-sm font-semibold transition-colors'
                  : 'shrink-0 px-4 py-1.5 bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:border-black hover:text-black transition-colors'
              }
            >
              {brand}
            </button>
          ))}
        </div>
      </section>

      {/* Live Auctions */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-xl font-black text-black tracking-tight uppercase">
            <Flame className="h-4 w-4" strokeWidth={2} />
            Live Auctions
          </h2>
          <span className="text-sm font-mono font-semibold text-gray-500">
            {filtered.length} active
          </span>
        </div>
        <AuctionGrid auctions={filtered} loading={loading} />
      </section>
    </div>
  );
}

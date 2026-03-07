'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuctions } from '@/hooks/useAuctions';
import AuctionGrid from '@/components/auction/AuctionGrid';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';

const CATEGORIES = ['All', ...ITEM_CATEGORIES];
const SORT_OPTIONS = [
    { label: 'Ending Soon', value: 'ends_at:asc' },
    { label: 'Newest', value: 'created_at:desc' },
    { label: 'Price: Low → High', value: 'current_price:asc' },
    { label: 'Price: High → Low', value: 'current_price:desc' },
];

export default function AuctionsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" /></div>}>
            <AuctionsContent />
        </Suspense>
    );
}

function AuctionsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialise from URL params
    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [inputVal, setInputVal] = useState(searchParams.get('q') ?? '');
    const [category, setCategory] = useState(searchParams.get('brand') ?? 'All');
    const [sort, setSort] = useState(searchParams.get('sort') ?? 'ends_at:asc');

    const [orderBy, ascending] = sort.split(':') as [
        'ends_at' | 'created_at' | 'current_price',
        string
    ];

    const { auctions, loading } = useAuctions({
        status: 'active',
        brand: category === 'All' ? undefined : category,
        search: query || undefined,
        orderBy,
        ascending: ascending === 'asc',
    });

    // Sync filters → URL (shallow replace so back button works)
    const syncUrl = useCallback(
        (q: string, b: string, s: string) => {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (b && b !== 'All') params.set('brand', b);
            if (s && s !== 'ends_at:asc') params.set('sort', s);
            const qs = params.toString();
            router.replace(qs ? `/auctions?${qs}` : '/auctions', { scroll: false });
        },
        [router]
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQuery(inputVal);
        syncUrl(inputVal, category, sort);
    };

    const handleCategory = (b: string) => {
        setCategory(b);
        syncUrl(query, b, sort);
    };

    const handleSort = (s: string) => {
        setSort(s);
        syncUrl(query, category, s);
    };

    const clearSearch = () => {
        setInputVal('');
        setQuery('');
        syncUrl('', category, sort);
    };

    // Respond to external navigation (e.g. Navbar search → /auctions?q=...)
    useEffect(() => {
        const urlQ = searchParams.get('q') ?? '';
        setInputVal(urlQ);
        setQuery(urlQ);
    }, [searchParams]);

    const hasFilters = query || category !== 'All';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-black tracking-tight">Browse</h1>
                {hasFilters && (
                    <button
                        onClick={() => { setInputVal(''); setQuery(''); setCategory('All'); syncUrl('', 'All', sort); }}
                        className="text-xs font-semibold text-gray-400 hover:text-black transition-colors flex items-center gap-1"
                    >
                        <X className="h-3.5 w-3.5" /> Clear filters
                    </button>
                )}
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Search items…"
                        className="w-full border border-gray-200 pl-9 pr-9 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
                    />
                    {inputVal && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors shrink-0"
                >
                    Search
                </button>
            </form>

            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-3 mb-4">
                {CATEGORIES.map((c) => (
                    <button
                        key={c}
                        onClick={() => handleCategory(c)}
                        className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                            category === c
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                        }`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* Sort + result count row */}
            <div className="flex items-center justify-between mb-5">
                <p className="text-xs text-gray-400 font-medium">
                    {loading ? 'Loading…' : `${auctions.length} listing${auctions.length !== 1 ? 's' : ''}`}
                    {query && <span className="ml-1">for <span className="font-semibold text-black">&quot;{query}&quot;</span></span>}
                </p>
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <select
                        value={sort}
                        onChange={(e) => handleSort(e.target.value)}
                        className="text-xs font-semibold text-black bg-transparent focus:outline-none cursor-pointer"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid */}
            <AuctionGrid auctions={auctions} loading={loading} />
        </div>
    );
}

'use client';

import Link from 'next/link';
import { Suspense, startTransition, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useAuctions } from '@/hooks/useAuctions';
import type { ListingType } from '@/lib/listings';
import AuctionGrid from '@/components/auction/AuctionGrid';

const CATEGORIES = ['All', ...ITEM_CATEGORIES];
const SORT_OPTIONS = [
    { label: 'Ending Soon', value: 'ends_at:asc' },
    { label: 'Newest', value: 'created_at:desc' },
    { label: 'Price: Low to High', value: 'current_price:asc' },
    { label: 'Price: High to Low', value: 'current_price:desc' },
];

function AuctionsContent({ listingType }: { listingType: ListingType }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [inputVal, setInputVal] = useState(searchParams.get('q') ?? '');
    const [category, setCategory] = useState(searchParams.get('brand') ?? 'All');
    const [sort, setSort] = useState(searchParams.get('sort') ?? 'ends_at:asc');

    const [orderBy, ascending] = sort.split(':') as [
        'ends_at' | 'created_at' | 'current_price',
        string,
    ];

    const { auctions, loading, error } = useAuctions({
        status: 'visible',
        listingType,
        brand: category === 'All' ? undefined : category,
        search: query || undefined,
        orderBy,
        ascending: ascending === 'asc',
    });

    const basePath = listingType === 'permanent' ? '/listings' : '/auctions';
    const pageTitle = listingType === 'permanent' ? 'Permanent Listings' : 'Auctions';
    const pageDescription = listingType === 'permanent'
        ? 'Browse fixed-price style permanent listings separately from timed auctions.'
        : 'Browse timed auctions separately from permanent listings.';

    const syncUrl = useCallback((q: string, b: string, s: string) => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (b && b !== 'All') params.set('brand', b);
        if (s && s !== 'ends_at:asc') params.set('sort', s);
        const qs = params.toString();
        router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    }, [basePath, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQuery(inputVal);
        syncUrl(inputVal, category, sort);
    };

    const handleCategory = (nextCategory: string) => {
        setCategory(nextCategory);
        syncUrl(query, nextCategory, sort);
    };

    const handleSort = (nextSort: string) => {
        setSort(nextSort);
        syncUrl(query, category, nextSort);
    };

    const clearSearch = () => {
        setInputVal('');
        setQuery('');
        syncUrl('', category, sort);
    };

    useEffect(() => {
        const urlQ = searchParams.get('q') ?? '';
        startTransition(() => {
            setInputVal(urlQ);
            setQuery(urlQ);
        });
    }, [searchParams]);

    const hasFilters = query || category !== 'All';
    const hasSortOverride = sort !== 'ends_at:asc';
    const activeFilterCount = [!!query, category !== 'All', hasSortOverride].filter(Boolean).length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8">
            <div className="mb-5 border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-gray-100 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500 border border-gray-200 bg-white px-2.5 py-1 mb-3">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            Marketplace Browse
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">{pageTitle}</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
                            {pageDescription} Sold items stay here for 48 hours, then remain only on the seller&apos;s page.
                        </p>
                    </div>

                    <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Results</p>
                        <p className="text-xl font-black text-black tracking-tight">
                            {loading ? '...' : auctions.length}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {query && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest bg-black text-white px-2.5 py-1">
                            Search: {query}
                        </span>
                    )}
                    {category !== 'All' && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest bg-white border border-gray-300 text-black px-2.5 py-1">
                            Category: {category}
                        </span>
                    )}
                    {hasSortOverride && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest bg-white border border-gray-300 text-black px-2.5 py-1">
                            Sorted
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                    Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </p>
                {hasFilters && (
                    <button
                        onClick={() => {
                            setInputVal('');
                            setQuery('');
                            setCategory('All');
                            syncUrl('', 'All', sort);
                        }}
                        className="text-xs font-semibold text-gray-500 hover:text-black transition-colors flex items-center gap-1.5"
                    >
                        <X className="h-3.5 w-3.5" /> Clear filters
                    </button>
                )}
            </div>

            <div className="border border-gray-200 bg-white p-3 sm:p-4 mb-5 space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="Search listings by title, brand, or model..."
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

                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {[
                        { href: '/auctions', label: 'Auctions', active: listingType === 'auction' },
                        { href: '/listings', label: 'Permanent Listings', active: listingType === 'permanent' },
                    ].map((tab) => (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                                tab.active
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>

                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
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
            </div>

            {error && (
                <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between mb-5 border border-gray-200 bg-white px-3 py-2.5">
                <p className="text-xs text-gray-500 font-medium">
                    {loading ? 'Loading...' : `${auctions.length} listing${auctions.length !== 1 ? 's' : ''}`}
                    {query && <span className="ml-1">for <span className="font-semibold text-black">&quot;{query}&quot;</span></span>}
                </p>
                <div className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    <select
                        value={sort}
                        onChange={(e) => handleSort(e.target.value)}
                        className="text-xs font-semibold text-black bg-transparent focus:outline-none cursor-pointer"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <AuctionGrid auctions={auctions} loading={loading} />
        </div>
    );
}

export default function AuctionsPageClient() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" /></div>}>
            <AuctionsContent listingType="auction" />
        </Suspense>
    );
}

export function PermanentListingsPageClient() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" /></div>}>
            <AuctionsContent listingType="permanent" />
        </Suspense>
    );
}

'use client';

import Link from 'next/link';
import { Suspense, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { CONDITION_LABELS, ITEM_CATEGORIES } from '@/lib/constants';
import { useAuctions } from '@/hooks/useAuctions';
import { shuffled } from '@/lib/rotation';
import { buildBrowseSearch, normalizePriceRange } from '@/lib/browseParams';
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
    const [condition, setCondition] = useState(searchParams.get('cond') ?? 'All');
    const [minPrice, setMinPrice] = useState(searchParams.get('min') ?? '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('max') ?? '');
    const [deliveryOnly, setDeliveryOnly] = useState(searchParams.get('delivery') === '1');
    const [priceDraft, setPriceDraft] = useState({
        min: searchParams.get('min') ?? '',
        max: searchParams.get('max') ?? '',
    });
    const [showFilters, setShowFilters] = useState(
        Boolean(searchParams.get('cond') ?? searchParams.get('min') ?? searchParams.get('max') ?? searchParams.get('delivery')),
    );

    const [orderBy, ascending] = sort.split(':') as [
        'ends_at' | 'created_at' | 'current_price',
        string,
    ];

    const { auctions, loading, error } = useAuctions({
        status: 'visible',
        listingType,
        brand: category === 'All' ? undefined : category,
        search: query || undefined,
        condition: condition === 'All' ? undefined : condition,
        minPrice: minPrice !== '' && !Number.isNaN(Number(minPrice)) ? Number(minPrice) : undefined,
        maxPrice: maxPrice !== '' && !Number.isNaN(Number(maxPrice)) ? Number(maxPrice) : undefined,
        deliveryAvailable: deliveryOnly,
        orderBy,
        ascending: ascending === 'asc',
    });

    // Default view rotates on every open so visitors do not always see the
    // same listings in the same order; an explicit sort choice is preserved.
    const isDefaultSort = !searchParams.get('sort');
    const visibleAuctions = useMemo(
        () => (isDefaultSort ? shuffled(auctions) : auctions),
        [auctions, isDefaultSort]
    );

    const basePath = listingType === 'permanent' ? '/listings' : '/auctions';
    const pageTitle = listingType === 'permanent' ? 'Permanent Listings' : 'Auctions';
    const pageDescription = listingType === 'permanent'
        ? 'Browse fixed-price style permanent listings separately from timed auctions.'
        : 'Browse timed auctions separately from permanent listings.';

    const syncUrl = useCallback((over: { q?: string; b?: string; s?: string; cond?: string; min?: string; max?: string; del?: boolean }) => {
        const q = over.q ?? query;
        const b = over.b ?? category;
        const s = over.s ?? sort;
        const cd = over.cond ?? condition;
        const mn = over.min ?? minPrice;
        const mx = over.max ?? maxPrice;
        const dl = over.del ?? deliveryOnly;
        const qs = buildBrowseSearch({ q, brand: b, sort: s, cond: cd, min: mn, max: mx, del: dl });
        router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    }, [basePath, router, query, category, sort, condition, minPrice, maxPrice, deliveryOnly]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQuery(inputVal);
        syncUrl({ q: inputVal });
    };

    const handleCategory = (nextCategory: string) => {
        setCategory(nextCategory);
        syncUrl({ b: nextCategory });
    };

    const handleSort = (nextSort: string) => {
        setSort(nextSort);
        syncUrl({ s: nextSort });
    };

    const handleCondition = (c: string) => {
        setCondition(c);
        syncUrl({ cond: c });
    };

    const applyPriceRange = (min: string, max: string) => {
        const normalized = normalizePriceRange(min, max);
        setMinPrice(normalized.min);
        setMaxPrice(normalized.max);
        setPriceDraft(normalized);
        syncUrl(normalized);
    };

    const handleDeliveryOnly = (v: boolean) => {
        setDeliveryOnly(v);
        syncUrl({ del: v });
    };

    const clearFilters = () => {
        setCondition('All');
        setMinPrice('');
        setMaxPrice('');
        setPriceDraft({ min: '', max: '' });
        setDeliveryOnly(false);
        syncUrl({ cond: 'All', min: '', max: '', del: false });
    };

    const activeFilterCount =
        (condition !== 'All' ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (deliveryOnly ? 1 : 0);

    const clearSearch = () => {
        setInputVal('');
        setQuery('');
        syncUrl({ q: '' });
    };

    useEffect(() => {
        const urlQ = searchParams.get('q') ?? '';
        startTransition(() => {
            setInputVal(urlQ);
            setQuery(urlQ);
        });
    }, [searchParams]);

    const hasFilters = query || category !== 'All';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-black tracking-tight">{pageTitle}</h1>
                    <p className="text-xs text-gray-400 mt-1">{pageDescription} Sold items stay here for 48 hours, then remain only on the seller&apos;s page.</p>
                </div>
                {hasFilters && (
                    <button
                        onClick={() => {
                            setInputVal('');
                            setQuery('');
                            setCategory('All');
                            syncUrl({ q: '', b: 'All' });
                        }}
                        className="text-xs font-semibold text-gray-400 hover:text-black transition-colors flex items-center gap-1"
                    >
                        <X className="h-3.5 w-3.5" /> Clear filters
                    </button>
                )}
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Search items..."
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

            {error && (
                <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                </div>
            )}

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-3 mb-4">
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

            <div className="flex items-center justify-between mb-5">
                <p className="text-xs text-gray-400 font-medium">
                    {loading ? 'Loading...' : `${visibleAuctions.length} listing${visibleAuctions.length !== 1 ? 's' : ''}`}
                    {query && <span className="ml-1">for <span className="font-semibold text-black">&quot;{query}&quot;</span></span>}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowFilters((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                            showFilters || activeFilterCount > 0
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                        }`}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </button>
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

            {showFilters && (
                <div className="mb-5 border border-gray-200 bg-white p-3 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Condition</span>
                        <select
                            value={condition}
                            onChange={(e) => handleCondition(e.target.value)}
                            className="border border-gray-200 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-black"
                        >
                            <option value="All">Any</option>
                            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Min price (GH₵)</span>
                        <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="0"
                            value={priceDraft.min}
                            onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
                            onBlur={() => applyPriceRange(priceDraft.min, priceDraft.max)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyPriceRange(priceDraft.min, priceDraft.max);
                            }}
                            className="w-24 border border-gray-200 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-black"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Max price (GH₵)</span>
                        <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="Any"
                            value={priceDraft.max}
                            onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
                            onBlur={() => applyPriceRange(priceDraft.min, priceDraft.max)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyPriceRange(priceDraft.min, priceDraft.max);
                            }}
                            className="w-24 border border-gray-200 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-black"
                        />
                    </label>
                    <label className="flex items-center gap-2 pb-2">
                        <input
                            type="checkbox"
                            checked={deliveryOnly}
                            onChange={(e) => handleDeliveryOnly(e.target.checked)}
                            className="h-3.5 w-3.5 accent-black"
                        />
                        <span className="text-xs font-semibold text-gray-600">Delivery available</span>
                    </label>
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="pb-2 text-xs font-semibold text-gray-400 underline hover:text-black"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            <AuctionGrid auctions={visibleAuctions} loading={loading} />
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

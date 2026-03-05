import { Search, SlidersHorizontal } from 'lucide-react';
import { PHONE_BRANDS, CONDITION_LABELS } from '@/lib/constants';

interface AuctionFiltersProps {
    search: string;
    setSearch: (s: string) => void;
    brand: string;
    setBrand: (b: string) => void;
    condition: string;
    setCondition: (c: string) => void;
    minStorage: number;
    setMinStorage: (s: number) => void;
    sortBy: 'current_price' | 'ends_at' | 'created_at';
    setSortBy: (s: 'current_price' | 'ends_at' | 'created_at') => void;
    ascending: boolean;
    setAscending: (a: boolean) => void;
}

export default function AuctionFilters({
    search,
    setSearch,
    brand,
    setBrand,
    condition,
    setCondition,
    minStorage,
    setMinStorage,
    sortBy,
    setSortBy,
    ascending,
    setAscending,
}: AuctionFiltersProps) {
    const brands = ['All', ...PHONE_BRANDS.slice(0, 8)];
    const storageOptions = [
        { label: 'All Storage', value: 0 },
        { label: '64GB+', value: 64 },
        { label: '128GB+', value: 128 },
        { label: '256GB+', value: 256 },
        { label: '512GB+', value: 512 },
    ];

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'ending_soon') {
            setSortBy('ends_at');
            setAscending(true);
        } else if (val === 'price_asc') {
            setSortBy('current_price');
            setAscending(true);
        } else if (val === 'price_desc') {
            setSortBy('current_price');
            setAscending(false);
        } else if (val === 'newest') {
            setSortBy('created_at');
            setAscending(false);
        }
    };

    const currentSortValue =
        sortBy === 'ends_at' ? 'ending_soon' :
            sortBy === 'created_at' ? 'newest' :
                (sortBy === 'current_price' && ascending) ? 'price_asc' : 'price_desc';

    return (
        <div className="bg-white border border-gray-200 p-4 space-y-4 shadow-sm mb-10">
            {/* Top Row: Search */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, brand, or model..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm text-black transition-colors placeholder:text-gray-400"
                />
            </div>

            {/* Bottom Row: Advanced Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                {/* Brand */}
                <div className="min-w-0">
                    <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="block w-full text-black bg-white border border-gray-200 py-2.5 pl-3 pr-8 text-sm truncate focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                    >
                        {brands.map(b => (
                            <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>
                        ))}
                    </select>
                </div>

                {/* Condition */}
                <div className="min-w-0">
                    <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="block w-full text-black bg-white border border-gray-200 py-2.5 pl-3 pr-8 text-sm truncate focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                    >
                        <option value="All">All Conditions</option>
                        {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* Storage */}
                <div className="min-w-0">
                    <select
                        value={minStorage}
                        onChange={(e) => setMinStorage(Number(e.target.value))}
                        className="block w-full text-black bg-white border border-gray-200 py-2.5 pl-3 pr-8 text-sm truncate focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                    >
                        {storageOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Sort */}
                <div className="relative min-w-0">
                    <select
                        value={currentSortValue}
                        onChange={handleSortChange}
                        className="block w-full text-black bg-gray-50 border border-gray-200 font-medium py-2.5 pl-3 pr-8 text-sm truncate focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                    >
                        <option value="ending_soon">Ending Soonest</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="newest">Newly Listed</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

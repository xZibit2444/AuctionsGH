'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';
import {
    Smartphone, Monitor, Laptop, Car, Shirt, Home, Dumbbell,
    Baby, HeartPulse, Wheat, LayoutGrid,
} from 'lucide-react';

const CATEGORY_INACTIVE: Record<string, string> = {
    'All':                'bg-amber-50 text-amber-700 border border-amber-200',
    'Phones & Tablets':   'bg-blue-50 text-blue-700 border border-blue-200',
    'Electronics':        'bg-purple-50 text-purple-700 border border-purple-200',
    'Computers & Laptops':'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'Vehicles':           'bg-red-50 text-red-700 border border-red-200',
    'Fashion & Clothing': 'bg-pink-50 text-pink-700 border border-pink-200',
    'Home & Garden':      'bg-green-50 text-green-700 border border-green-200',
    'Sports & Outdoors':  'bg-orange-50 text-orange-700 border border-orange-200',
    'Kids & Baby':        'bg-yellow-50 text-yellow-700 border border-yellow-200',
    'Health & Beauty':    'bg-rose-50 text-rose-700 border border-rose-200',
    'Agriculture':        'bg-lime-50 text-lime-700 border border-lime-200',
    'Other':              'bg-gray-100 text-gray-600 border border-gray-200',
};

const CATEGORY_ACTIVE: Record<string, string> = {
    'All':                'bg-amber-500 text-white border border-amber-500',
    'Phones & Tablets':   'bg-blue-600 text-white border border-blue-600',
    'Electronics':        'bg-purple-600 text-white border border-purple-600',
    'Computers & Laptops':'bg-indigo-600 text-white border border-indigo-600',
    'Vehicles':           'bg-red-600 text-white border border-red-600',
    'Fashion & Clothing': 'bg-pink-600 text-white border border-pink-600',
    'Home & Garden':      'bg-green-600 text-white border border-green-600',
    'Sports & Outdoors':  'bg-orange-500 text-white border border-orange-500',
    'Kids & Baby':        'bg-yellow-500 text-white border border-yellow-500',
    'Health & Beauty':    'bg-rose-600 text-white border border-rose-600',
    'Agriculture':        'bg-lime-600 text-white border border-lime-600',
    'Other':              'bg-gray-700 text-white border border-gray-700',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    'All':               LayoutGrid,
    'Phones & Tablets':  Smartphone,
    'Electronics':       Monitor,
    'Computers & Laptops': Laptop,
    'Vehicles':          Car,
    'Fashion & Clothing': Shirt,
    'Home & Garden':     Home,
    'Sports & Outdoors': Dumbbell,
    'Kids & Baby':       Baby,
    'Health & Beauty':   HeartPulse,
    'Agriculture':       Wheat,
    'Other':             LayoutGrid,
};

interface CategoryBarProps {
    selected: string;
    onSelect: (cat: string) => void;
}

export default function CategoryBar({ selected, onSelect }: CategoryBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
    };

    const cats = ['All', ...ITEM_CATEGORIES];

    return (
        <div className="relative group/cats">
            <button
                onClick={() => scroll('left')}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-white border border-gray-200 shadow-md hover:bg-gray-50 opacity-0 group-hover/cats:opacity-100 transition-opacity rounded-full"
                aria-label="Scroll categories left"
            >
                <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            >
                {cats.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat];
                    const active = selected === cat;
                    const colorClass = active
                        ? (CATEGORY_ACTIVE[cat] ?? 'bg-gray-700 text-white border border-gray-700')
                        : (CATEGORY_INACTIVE[cat] ?? 'bg-gray-100 text-gray-600 border border-gray-200');
                    return (
                        <button
                            key={cat}
                            onClick={() => onSelect(cat)}
                            className={`shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${colorClass} ${active ? 'shadow-md scale-105' : 'hover:scale-105 hover:shadow-sm'}`}
                        >
                            {Icon && (
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${active ? 'bg-white/25' : 'bg-white/70'}`}>
                                    <Icon className="h-3 w-3" strokeWidth={2} />
                                </span>
                            )}
                            {cat}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => scroll('right')}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-white border border-gray-200 shadow-md hover:bg-gray-50 opacity-0 group-hover/cats:opacity-100 transition-opacity rounded-full"
                aria-label="Scroll categories right"
            >
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

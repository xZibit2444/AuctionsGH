'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';
import {
    Smartphone, Monitor, Laptop, Car, Shirt, Home, Dumbbell,
    Baby, HeartPulse, Wheat, LayoutGrid,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
    'All':               'bg-amber-100 text-amber-700',
    'Phones & Tablets':  'bg-blue-100 text-blue-700',
    'Electronics':       'bg-purple-100 text-purple-700',
    'Computers & Laptops':'bg-indigo-100 text-indigo-700',
    'Vehicles':          'bg-red-100 text-red-700',
    'Fashion & Clothing':'bg-pink-100 text-pink-700',
    'Home & Garden':     'bg-green-100 text-green-700',
    'Sports & Outdoors': 'bg-orange-100 text-orange-700',
    'Kids & Baby':       'bg-yellow-100 text-yellow-700',
    'Health & Beauty':   'bg-rose-100 text-rose-700',
    'Agriculture':       'bg-lime-100 text-lime-700',
    'Other':             'bg-gray-100 text-gray-600',
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
                    const color = CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600';
                    return (
                        <button
                            key={cat}
                            onClick={() => onSelect(cat)}
                            className={`shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap shadow-sm ${
                                active
                                    ? 'bg-black text-white shadow-md scale-105'
                                    : `${color} hover:scale-105 hover:shadow-md`
                            }`}
                        >
                            {Icon && (
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${active ? 'bg-white/20' : 'bg-white/60'}`}>
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

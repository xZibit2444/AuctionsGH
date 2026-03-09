'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';
import {
    Smartphone, Monitor, Laptop, Car, Shirt, Home, Dumbbell,
    Baby, HeartPulse, Wheat, LayoutGrid,
} from 'lucide-react';



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
                    return (
                        <button
                            key={cat}
                            onClick={() => onSelect(cat)}
                            className={`shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full border transition-all whitespace-nowrap ${
                                active
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                            }`}
                        >
                            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
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

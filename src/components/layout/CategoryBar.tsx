'use client';

import { ITEM_CATEGORIES } from '@/lib/constants';

interface CategoryBarProps {
    selected: string;
    onSelect: (cat: string) => void;
}

/** Mockup-style category chips: plain pills, active chip solid black. */
export default function CategoryBar({ selected, onSelect }: CategoryBarProps) {
    const cats = ['All', ...ITEM_CATEGORIES];

    return (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {cats.map((cat) => {
                const active = selected === cat;
                return (
                    <button
                        key={cat}
                        onClick={() => onSelect(cat)}
                        className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                            active
                                ? 'border-[#12100C] bg-[#12100C] text-white'
                                : 'border-[#E9E6E0] bg-white text-[#6E675E] hover:border-stone-400 hover:text-[#191612]'
                        }`}
                    >
                        {cat}
                    </button>
                );
            })}
        </div>
    );
}

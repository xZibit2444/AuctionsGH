'use client';

import { Children, useState, type ReactNode } from 'react';

interface MobileSeeMoreProps {
    children: ReactNode;
    className?: string;
    /** Items shown on mobile before "See more". Desktop always shows all. */
    initial?: number;
    noun?: string;
}

/**
 * Renders every child in the DOM (so crawlers and desktop see everything) but
 * on small screens hides items past `initial` until the user taps "See more".
 */
export default function MobileSeeMore({ children, className, initial = 4, noun = 'listings' }: MobileSeeMoreProps) {
    const [expanded, setExpanded] = useState(false);
    const items = Children.toArray(children);
    const hiddenCount = Math.max(0, items.length - initial);

    return (
        <>
            <div className={className}>
                {items.map((child, index) => (
                    <div key={index} className={!expanded && index >= initial ? 'hidden md:block' : 'contents'}>
                        {child}
                    </div>
                ))}
            </div>
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-black transition-colors hover:border-gray-400 md:hidden"
                    aria-expanded={expanded}
                >
                    {expanded ? 'Show fewer' : `See more ${noun} (${hiddenCount})`}
                </button>
            )}
        </>
    );
}

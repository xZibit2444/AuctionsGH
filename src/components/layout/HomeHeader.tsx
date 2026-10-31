'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Plus } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ProfileShortcut from './ProfileShortcut';

interface HomeHeaderProps {
    /** Controlled search (homepage). When omitted, submitting goes to /listings?q=. */
    search?: string;
    setSearch?: (value: string) => void;
    /** Hide the header logo where the desktop sidebar already shows it (homepage). */
    hideLogo?: boolean;
}

/**
 * Storefront top bar for the homepage, matching the approved mockup:
 * logo, pill search, notifications, sell CTA and account avatar in one
 * horizontal row. Desktop only; phones keep the existing MobileNav header.
 */
export default function HomeHeader({ search, setSearch, hideLogo = false }: HomeHeaderProps) {
    const router = useRouter();
    const [localSearch, setLocalSearch] = useState('');
    const controlled = typeof search === 'string' && !!setSearch;
    const value = controlled ? search : localSearch;
    const onChange = controlled ? setSearch! : setLocalSearch;
    return (
        <header className="sticky top-0 z-40 hidden items-center gap-4 border-b border-[#E9E6E0] bg-white px-7 py-3 sm:flex">
            {!hideLogo && (
                <Link href="/" className="shrink-0">
                    <Image
                        src="/logo.png"
                        alt="AuctionsGH"
                        width={140}
                        height={40}
                        className="h-9 w-auto object-contain"
                        priority
                    />
                </Link>
            )}

            <form
                role="search"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!controlled) {
                        const q = localSearch.trim();
                        router.push(q ? `/listings?q=${encodeURIComponent(q)}` : '/listings');
                    }
                }}
                className={`flex ${controlled ? 'h-11' : 'h-9'} max-w-[520px] flex-1 items-center gap-2 rounded-full border border-[#E9E6E0] bg-[#F5F4F0] px-4`}
            >
                <Search className="h-4 w-4 shrink-0 text-[#6E675E]" strokeWidth={2} />
                <input
                    type="search"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search phones, furniture, fashion..."
                    aria-label="Search listings"
                    className="w-full bg-transparent text-sm text-[#191612] placeholder-[#6E675E] outline-none"
                />
            </form>

            <div className="flex-1" />

            <NotificationBell />
            <Link
                href="/auctions/create"
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-amber-400 px-[18px] text-sm font-bold text-[#12100C] transition-colors hover:bg-amber-300"
            >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Sell an item
            </Link>
            <ProfileShortcut />
        </header>
    );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Plus } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ProfileShortcut from './ProfileShortcut';

interface HomeHeaderProps {
    search: string;
    setSearch: (value: string) => void;
}

/**
 * Storefront top bar for the homepage, matching the approved mockup:
 * logo, pill search, notifications, sell CTA and account avatar in one
 * horizontal row. Desktop only; phones keep the existing MobileNav header.
 */
export default function HomeHeader({ search, setSearch }: HomeHeaderProps) {
    return (
        <header className="sticky top-0 z-40 hidden items-center gap-4 border-b border-[#E9E6E0] bg-white px-7 py-3 sm:flex">
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

            <div className="flex max-w-xl flex-1 items-center gap-2 rounded-full border border-[#E9E6E0] bg-[#F5F4F0] px-4 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-[#6E675E]" strokeWidth={2} />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search phones, furniture, fashion..."
                    aria-label="Search listings"
                    className="w-full bg-transparent text-sm text-[#191612] placeholder-[#6E675E] outline-none"
                />
            </div>

            <div className="flex-1" />

            <NotificationBell />
            <Link
                href="/auctions/create"
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-amber-400 px-4 py-2.5 text-sm font-bold text-[#12100C] transition-colors hover:bg-amber-300"
            >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Sell an item
            </Link>
            <ProfileShortcut />
        </header>
    );
}

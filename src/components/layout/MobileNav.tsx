'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Plus, Heart, LayoutDashboard } from 'lucide-react';

const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/auctions', label: 'Browse', icon: Search },
    { href: '/auctions/create', label: 'Sell', icon: Plus, highlighted: true },
    { href: '/saved', label: 'Saved', icon: Heart },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function MobileNav() {
    const pathname = usePathname();

    if (pathname === '/login' || pathname === '/signup') return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 sm:hidden">
            <div className="flex items-center justify-around h-16 px-2">
                {tabs.map((tab) => {
                    const isActive =
                        tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                'flex flex-col items-center gap-1 px-3 py-1 transition-colors',
                                tab.highlighted
                                    ? 'bg-black text-white p-3 -mt-5 shadow-lg'
                                    : isActive
                                        ? 'text-black'
                                        : 'text-gray-400 hover:text-gray-700'
                            )}
                        >
                            <Icon
                                className="h-5 w-5"
                                strokeWidth={isActive && !tab.highlighted ? 2.5 : 1.5}
                                fill={tab.href === '/saved' && isActive ? 'currentColor' : 'none'}
                            />
                            {!tab.highlighted && (
                                <span className={cn('text-[10px]', isActive ? 'font-bold' : 'font-medium')}>
                                    {tab.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

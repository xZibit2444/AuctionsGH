'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Home, Search, Plus, Heart, LayoutDashboard } from 'lucide-react';
import NotificationBell from './NotificationBell';

const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/auctions', label: 'Browse', icon: Search },
    { href: '/auctions/create', label: 'Sell', icon: Plus, highlighted: true },
    { href: '/saved', label: 'Saved', icon: Heart },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function MobileNav() {
    const pathname = usePathname();
    const { profile } = useAuth();

    const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (pathname !== '/') return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (pathname === '/login' || pathname === '/signup') return null;

    return (
        <>
            {/* Mobile top header with logo */}
            <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4">
                <Link href="/" onClick={handleLogoClick}>
                    <Image
                        src="/logo.png"
                        alt="AuctionsGH"
                        width={120}
                        height={40}
                        className="h-9 w-auto object-contain"
                        priority
                    />
                </Link>
                <NotificationBell />
            </header>

            {/* Mobile bottom tab bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 sm:hidden">
            <div className="flex items-center justify-around h-16 px-2">
                {tabs.map((tab) => {
                    if (tab.href === '/auctions/create' && !profile?.is_admin) return null;

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
        </>
    );
}

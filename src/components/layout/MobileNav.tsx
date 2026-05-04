'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
    Home,
    Search,
    Plus,
    Heart,
    LayoutDashboard,
    Menu,
    X,
    Package,
    HelpCircle,
    User,
    Settings,
    LogOut,
    ChevronRight,
    Newspaper,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/auctions', label: 'Auctions', icon: Search },
    { href: '/auctions/create', label: 'Sell', icon: Plus, highlighted: true },
    { href: '/listings', label: 'Listings', icon: Package },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const drawerItems = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/auctions', label: 'Auctions', icon: Search },
    { href: '/listings', label: 'Permanent Listings', icon: Package },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, authRequired: true },
    { href: '/profile', label: 'Profile', icon: User, authRequired: true },
    { href: '/saved', label: 'Saved', icon: Heart, authRequired: true },
    { href: '/orders', label: 'Orders', icon: Package, authRequired: true },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
    { href: '/news', label: 'News', icon: Newspaper },
];

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading, signOut } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href);

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, exact?: boolean) => {
        if (!isActive(href, exact)) return;
        e.preventDefault();
        setMenuOpen(false);
        router.refresh();
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (pathname !== '/') return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        queueMicrotask(() => {
            setMenuOpen(false);
        });
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    if (pathname === '/login' || pathname === '/signup') return null;

    return (
        <>
            {/* Mobile top header with logo */}
            <header className="sm:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--surface)] border-b border-[var(--border-color)] h-14 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMenuOpen(true)}
                        className="inline-flex h-9 w-9 items-center justify-center border border-[var(--border-color)] bg-[var(--surface-muted)] text-gray-500 transition-colors hover:text-[var(--foreground)]"
                        aria-label="Open navigation menu"
                    >
                        <Menu className="h-4 w-4" />
                    </button>
                    <Link href="/" onClick={(e) => {
                        handleLogoClick(e);
                        handleNavClick(e, '/', true);
                    }}>
                        <Image
                            src="/logo.png"
                            alt="AuctionsGH"
                            width={120}
                            height={40}
                            className="h-9 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                </div>
            </header>

            <div
                className={cn(
                    'sm:hidden fixed inset-0 z-50 transition-opacity duration-200',
                    menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                )}
                aria-hidden={!menuOpen}
            >
                <button
                    className="absolute inset-0 bg-black/60"
                    aria-label="Close navigation menu"
                    onClick={() => setMenuOpen(false)}
                />

                <aside
                    className={cn(
                        'absolute inset-y-0 left-0 flex w-[84vw] max-w-[320px] flex-col border-r border-[var(--border-color)] bg-[var(--surface)] shadow-2xl transition-transform duration-200',
                        menuOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-4">
                        <Link href="/" onClick={(e) => {
                            handleLogoClick(e);
                            handleNavClick(e, '/', true);
                        }}>
                            <Image
                                src="/logo.png"
                                alt="AuctionsGH"
                                width={132}
                                height={40}
                                className="h-9 w-auto object-contain"
                            />
                        </Link>
                        <button
                            onClick={() => setMenuOpen(false)}
                            className="inline-flex h-9 w-9 items-center justify-center border border-[var(--border-color)] bg-[var(--surface-muted)] text-gray-500 transition-colors hover:text-[var(--foreground)]"
                            aria-label="Close navigation menu"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-4">
                        <div className="space-y-1">
                            {drawerItems
                                .filter((item) => !item.authRequired || loading || user)
                                .map((item) => {
                                    const Icon = item.icon;
                                    const isActive = item.exact
                                        ? pathname === item.href
                                        : pathname === item.href || pathname.startsWith(item.href + '/');

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={(e) => handleNavClick(e, item.href, item.exact)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-[3px] px-3 py-3 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-amber-50 text-black'
                                                    : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    'h-4 w-4 shrink-0',
                                                    isActive ? 'text-amber-500' : 'opacity-70'
                                                )}
                                                strokeWidth={isActive ? 2.5 : 1.75}
                                            />
                                            <span className="flex-1">{item.label}</span>
                                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                                        </Link>
                                    );
                                })}
                        </div>

                        {profile?.is_admin && (
                            <div className="mt-4">
                                <Link
                                    href="/auctions/create"
                                    onClick={(e) => handleNavClick(e, '/auctions/create')}
                                    className="flex items-center justify-center gap-2 rounded-[3px] bg-amber-400 px-3 py-3 text-sm font-black text-black transition-colors hover:bg-amber-300"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create Listing
                                </Link>
                            </div>
                        )}

                    </nav>

                    <div className="border-t border-[var(--border-color)] p-3">
                        {!loading && user ? (
                            <div className="space-y-1">
                                <div className="mb-2 flex items-center gap-3 rounded-[3px] bg-[var(--surface-muted)] px-3 py-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-amber-400 text-sm font-black text-black">
                                        {profile?.full_name?.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) ||
                                            profile?.username?.[0]?.toUpperCase() ||
                                            user.email?.[0]?.toUpperCase() ||
                                            'U'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                                            {profile?.full_name || profile?.username || user.email?.split('@')[0]}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>

                                <Link
                                    href="/profile"
                                    onClick={(e) => handleNavClick(e, '/profile')}
                                    className="flex items-center gap-3 rounded-[3px] px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                                >
                                    <User className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                    Profile
                                </Link>
                                <Link
                                    href="/settings"
                                    onClick={(e) => handleNavClick(e, '/settings')}
                                    className="flex items-center gap-3 rounded-[3px] px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                                >
                                    <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                    Settings
                                </Link>
                                <ThemeToggle variant="drawer" />
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        void signOut();
                                    }}
                                    className="flex w-full items-center gap-3 rounded-[3px] px-3 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                    Sign out
                                </button>
                            </div>
                        ) : !loading ? (
                            <div className="space-y-2">
                                <Link
                                    href="/login"
                                    onClick={(e) => handleNavClick(e, '/login', true)}
                                    className="flex items-center justify-between rounded-[3px] border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-black"
                                >
                                    Log in
                                    <ChevronRight className="h-4 w-4 opacity-60" />
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={(e) => handleNavClick(e, '/signup', true)}
                                    className="flex items-center justify-center rounded-[3px] bg-amber-400 px-3 py-3 text-sm font-black text-black transition-colors hover:bg-amber-300"
                                >
                                    Sign up
                                </Link>
                                <ThemeToggle variant="drawer" />
                            </div>
                        ) : null}
                    </div>
                </aside>
            </div>

            {/* Mobile bottom tab bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--border-color)] sm:hidden">
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
                                onClick={(e) => handleNavClick(e, tab.href, tab.href === '/')}
                                className={cn(
                                    'flex flex-col items-center gap-1 px-3 py-1 transition-colors',
                                    tab.highlighted
                                        ? 'bg-black p-3 -mt-5 text-white shadow-lg'
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

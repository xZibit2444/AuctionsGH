'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Search, Settings, LayoutDashboard, LogOut, ChevronDown, X, User } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar() {
    const { user, profile, loading, signOut } = useAuth();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown & search on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus input when search opens
    useEffect(() => {
        if (searchOpen) searchInputRef.current?.focus();
    }, [searchOpen]);

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 gap-3">
                    {/* Logo */}
                    <Link href="/" className="shrink-0">
                        <Image
                            src="/logo.png"
                            alt="AuctionsGH"
                            width={120}
                            height={40}
                            className="h-10 w-auto object-contain"
                            priority
                        />
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-gray-500">
                        <Link href="/auctions" className="hover:text-black transition-colors">Browse</Link>
                        <Link href="/saved" className="hover:text-black transition-colors">Saved</Link>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Right actions */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Search — expandable on desktop, icon only on mobile (handled by MobileNav) */}
                        <div ref={searchRef} className="relative hidden sm:block">
                            {searchOpen ? (
                                <div className="flex items-center border border-black bg-white">
                                    <Search className="h-4 w-4 text-gray-400 mx-3 shrink-0" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search items..."
                                        className="w-48 py-2 pr-2 text-sm text-black placeholder-gray-400 bg-transparent focus:outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setSearchOpen(false);
                                            if (e.key === 'Enter' && searchQuery.trim()) {
                                                router.push(`/auctions?q=${encodeURIComponent(searchQuery)}`);
                                            }
                                        }}
                                    />
                                    <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-2 text-gray-400 hover:text-black transition-colors">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSearchOpen(true)}
                                    className="p-2 text-gray-400 hover:text-black transition-colors"
                                    aria-label="Open search"
                                >
                                    <Search className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="h-8 w-16 bg-gray-100 skeleton-pulse" />
                        ) : user ? (
                            <>
                                {profile?.is_admin && (
                                    <Link href="/auctions/create">
                                        <button className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors">
                                            <Plus className="h-4 w-4" />
                                            Sell
                                        </button>
                                    </Link>
                                )}

                                <NotificationBell />

                                {/* Profile Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen((o) => !o)}
                                        className="flex items-center gap-1 p-1 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-black text-xs">
                                            {(profile?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)) ||
                                                profile?.username?.[0]?.toUpperCase() ||
                                                user.email?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 shadow-lg z-50">
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-black text-black truncate">
                                                    {profile?.full_name ||
                                                        profile?.username ||
                                                        (user.user_metadata?.full_name as string | undefined) ||
                                                        user.email?.split('@')[0]}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                                            </div>
                                            <div className="py-1">
                                                <Link href="/dashboard" onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                                    <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                                                    Dashboard
                                                </Link>
                                                <Link href="/saved" onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                    Saved Auctions
                                                </Link>
                                                <Link href="/profile" onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                                    <User className="h-4 w-4" strokeWidth={1.5} />
                                                    Profile
                                                </Link>
                                                <Link href="/settings" onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                                    <Settings className="h-4 w-4" strokeWidth={1.5} />
                                                    Settings
                                                </Link>
                                                <Link href="/faq" onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    FAQ
                                                </Link>
                                            </div>
                                            <div className="border-t border-gray-100 py-1">
                                                <button onClick={() => { setDropdownOpen(false); signOut(); }}
                                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
                                                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                                                    Sign out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/login">
                                    <button className="px-4 py-2 text-sm font-semibold text-black hover:bg-gray-50 transition-colors">
                                        Log in
                                    </button>
                                </Link>
                                <Link href="/signup">
                                    <button className="px-4 py-2 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors">
                                        Sign up
                                    </button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

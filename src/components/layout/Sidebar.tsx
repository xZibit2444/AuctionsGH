'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import {
    Home, Search, LayoutDashboard, Heart, Package,
    HelpCircle, Plus, LogOut, Settings,
    Gavel, Bell, X, Trophy, Clock, Info, MessageCircle, Tag, ChevronRight,
    PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import { markAllReadAction } from '@/app/actions/notifications';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string | null;
    auction_id: string | null;
    order_id: string | null;
    is_read: boolean;
    created_at: string;
}

const typeIcon = (type: string) => {
    switch (type) {
        case 'new_bid': return <Gavel className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />;
        case 'auction_won': return <Trophy className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />;
        case 'outbid': return <Gavel className="h-3.5 w-3.5 text-red-400" strokeWidth={1.5} />;
        case 'auction_ended': return <Clock className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />;
        case 'new_message': return <MessageCircle className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />;
        case 'new_offer': return <Tag className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />;
        default: return <Info className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />;
    }
};

const NAV_ITEMS = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/auctions', label: 'Browse', icon: Search },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, authRequired: true },
    { href: '/saved', label: 'Saved', icon: Heart, authRequired: true },
    { href: '/orders', label: 'Orders', icon: Package, authRequired: true },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, profile, loading, signOut } = useAuth();
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const notifRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);

    // Sync body class for CSS-driven layout offset
    useEffect(() => {
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        return () => document.body.classList.remove('sidebar-collapsed');
    }, [collapsed]);

    const toggleCollapsed = () => {
        setCollapsed(c => {
            const next = !c;
            localStorage.setItem('sidebar-collapsed', String(next));
            return next;
        });
    };

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

    // Fetch notifications
    useEffect(() => {
        if (!user) return;
        const fetch = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data } = await (supabase.from('notifications') as any)
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(15);
                const items = (data ?? []) as Notification[];
                setNotifications(items);
                setUnread(items.filter(n => !n.is_read).length);
            } catch {
                // silently fall through — notifications stay empty
            }
        };
        fetch();

        const channel = supabase
            .channel('sidebar:notifications')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 15));
                setUnread(c => c + 1);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase, user]);

    // Close notif panel on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const handleMarkAllRead = async () => {
        await markAllReadAction();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const handleNotifClick = (n: Notification) => {
        setNotifOpen(false);
        const href = n.order_id
            ? `/orders/${n.order_id}`
            : n.auction_id && n.type === 'new_offer'
                ? `/auctions/${n.auction_id}#offer-panel`
                : n.auction_id
                    ? `/auctions/${n.auction_id}`
                    : null;

        if (href) {
            window.location.assign(href);
        }
    };

    return (
        <aside className={`fixed top-0 left-0 h-screen ${collapsed ? 'w-14' : 'w-55'} bg-white border-r border-gray-100 flex flex-col z-40 transition-[width] duration-200 ease-in-out overflow-hidden`}>

            {/* Brand + collapse toggle */}
            <div className="h-15 flex items-center border-b border-gray-100 shrink-0 relative">
                {collapsed ? (
                    <div className="flex-1 flex items-center justify-center">
                        <button
                            onClick={toggleCollapsed}
                            title="Expand sidebar"
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[3px] transition-colors"
                        >
                            <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="px-3 flex-1 flex items-center">
                            <Link href="/">
                                <Image src="/logo.png" alt="AuctionsGH" width={140} height={40} className="h-9 w-auto object-contain" priority />
                            </Link>
                        </div>
                        <button
                            onClick={toggleCollapsed}
                            title="Collapse sidebar"
                            className="absolute right-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[3px] transition-colors"
                        >
                            <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                    </>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
                {/* main links */}
                {NAV_ITEMS.filter(item => !item.authRequired || loading || user).map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            className={`group flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'} text-sm font-medium transition-all duration-150 rounded-[3px] ${active
                                ? 'bg-amber-50 text-gray-900'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <Icon
                                className={`h-4 w-4 shrink-0 transition-opacity ${active ? 'opacity-100 text-amber-500' : 'opacity-60 group-hover:opacity-100'}`}
                                strokeWidth={active ? 2.5 : 1.5}
                            />
                            {!collapsed && item.label}
                            {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                        </Link>
                    );
                })}

                {/* Divider */}
                {user && <div className="border-t border-gray-100 my-2" />}

                {/* Notifications row (auth only) */}
                {user && (
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setNotifOpen(o => !o)}
                            title={collapsed ? 'Notifications' : undefined}
                            className={`group w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'} text-sm font-medium transition-all duration-150 rounded-[3px] ${notifOpen ? 'bg-amber-50 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <div className="relative shrink-0">
                                <Bell className={`h-4 w-4 opacity-60 group-hover:opacity-100 ${notifOpen ? 'opacity-100' : ''}`} strokeWidth={1.5} />
                                {collapsed && unread > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full leading-none">
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                )}
                            </div>
                            {!collapsed && 'Notifications'}
                            {!collapsed && unread > 0 && (
                                <span className="ml-auto bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                    {unread > 9 ? '9+' : unread}
                                </span>
                            )}
                        </button>

                        {/* Notification panel — slides out to the right of sidebar */}
                        {notifOpen && (
                            <div className={`fixed ${collapsed ? 'left-14' : 'left-55'} top-0 h-screen w-80 bg-white border-l border-gray-100 flex flex-col z-50 shadow-xl`}>
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                                    <span className="text-sm font-black text-gray-900">Notifications</span>
                                    <div className="flex items-center gap-2">
                                        {unread > 0 && (
                                            <button onClick={handleMarkAllRead} className="text-[11px] text-amber-500 hover:text-amber-600 font-semibold">
                                                Mark all read
                                            </button>
                                        )}
                                        <button onClick={() => setNotifOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                                            <Bell className="h-6 w-6 mb-2 opacity-40" />
                                            No notifications yet
                                        </div>
                                    ) : notifications.map(n => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleNotifClick(n)}
                                            className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-amber-50/50' : ''}`}
                                        >
                                            <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-semibold leading-snug ${n.is_read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                                                {n.body && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{n.body}</p>}
                                                <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                            </div>
                                            {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Create listing CTA */}
            {profile?.is_admin && (
                <div className="px-2 pb-2">
                    {collapsed ? (
                        <Link
                            href="/auctions/create"
                            title="Create Listing"
                            className="flex items-center justify-center w-full py-2.5 bg-amber-400 text-black hover:bg-amber-300 transition-colors rounded-[3px]"
                        >
                            <Plus className="h-4 w-4" />
                        </Link>
                    ) : (
                        <Link
                            href="/auctions/create"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-400 text-black text-sm font-black hover:bg-amber-300 transition-colors rounded-[3px]"
                        >
                            <Plus className="h-4 w-4" />
                            Create Listing
                        </Link>
                    )}
                </div>
            )}

            {/* User section */}
            <div className="border-t border-gray-100 p-2 shrink-0">
                {!loading && user ? (
                    collapsed ? (
                        /* Collapsed: just avatar + sign out icon */
                        <div className="flex flex-col items-center gap-1">
                            <Link href="/settings" title="Settings" className="h-8 w-8 bg-amber-400 text-black flex items-center justify-center font-black text-xs rounded-[3px] hover:bg-amber-300 transition-colors">
                                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
                                    profile?.username?.[0]?.toUpperCase() ||
                                    user.email?.[0]?.toUpperCase() || 'U'}
                            </Link>
                            <button
                                onClick={() => signOut()}
                                title="Sign out"
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-[3px] transition-colors"
                            >
                                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {/* Avatar row */}
                            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                                <div className="h-7 w-7 bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0 rounded-xs">
                                    {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
                                        profile?.username?.[0]?.toUpperCase() ||
                                        user.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-gray-900 text-xs font-semibold truncate leading-tight">
                                        {profile?.full_name || profile?.username || user.email?.split('@')[0]}
                                    </p>
                                    <p className="text-gray-400 text-[10px] truncate">{user.email}</p>
                                </div>
                            </div>
                            <Link
                                href="/settings"
                                className="group flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-[3px]"
                            >
                                <Settings className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.5} />
                                Settings
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className="group w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all rounded-[3px]"
                            >
                                <LogOut className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.5} />
                                Sign out
                            </button>
                        </div>
                    )
                ) : !loading ? (
                    collapsed ? (
                        <div className="flex flex-col items-center gap-1.5 px-1">
                            <Link href="/login" title="Log in" className="flex items-center justify-center w-full py-2 border border-gray-200 hover:border-gray-400 text-gray-500 hover:text-gray-900 transition-all rounded-[3px]">
                                <LogOut className="h-4 w-4 rotate-180" strokeWidth={1.5} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2 px-1">
                            <Link
                                href="/login"
                                className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-400 transition-all rounded-[3px]"
                            >
                                Log in <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                            </Link>
                            <Link
                                href="/signup"
                                className="flex items-center justify-center w-full py-2 bg-amber-400 text-black text-sm font-black hover:bg-amber-300 transition-colors rounded-[3px]"
                            >
                                Sign up
                            </Link>
                        </div>
                    )
                ) : null}
            </div>
        </aside>
    );
}


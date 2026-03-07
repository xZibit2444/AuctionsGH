'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    Home, Search, LayoutDashboard, Heart, Package,
    HelpCircle, Plus, LogOut, Settings, ShieldCheck,
    Gavel, Bell, X, Trophy, Clock, Info, MessageCircle, Tag, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

function timeAgo(dateStr: string) {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 60) return 'just now';
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

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
    const router = useRouter();
    const { user, profile, loading, signOut } = useAuth();
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

    // Fetch notifications
    useEffect(() => {
        if (!user) return;
        const fetch = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('notifications') as any)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(15);
            const items = (data ?? []) as Notification[];
            setNotifications(items);
            setUnread(items.filter(n => !n.is_read).length);
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
    }, [user]);

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
        if (n.auction_id) router.push(`/auctions/${n.auction_id}`);
        else if (n.order_id) router.push(`/orders/${n.order_id}`);
    };

    return (
        <aside className="fixed top-0 left-0 h-screen w-55 bg-[#0f0f0f] flex flex-col z-40">

            {/* Brand */}
            <div className="px-5 h-15 flex items-center border-b border-white/6 shrink-0">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-amber-400 flex items-center justify-center shrink-0">
                        <Gavel className="h-4 w-4 text-black" strokeWidth={2.5} />
                    </div>
                    <span className="text-white font-black text-[17px] tracking-tight leading-none">
                        Auctions<span className="text-amber-400">GH</span>
                    </span>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {/* main links */}
                {NAV_ITEMS.filter(item => !item.authRequired || user).map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150 rounded-[3px] ${active
                                ? 'bg-white/8 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/4'}`}
                        >
                            <Icon
                                className={`h-4 w-4 shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                                strokeWidth={active ? 2.5 : 1.5}
                            />
                            {item.label}
                            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                        </Link>
                    );
                })}

                {/* Admin */}
                {profile?.is_admin && (
                    <Link
                        href="/admin"
                        className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150 rounded-[3px] ${pathname.startsWith('/admin')
                            ? 'bg-white/8 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/4'}`}
                    >
                        <ShieldCheck className={`h-4 w-4 shrink-0 ${pathname.startsWith('/admin') ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} strokeWidth={1.5} />
                        Admin
                        {pathname.startsWith('/admin') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                    </Link>
                )}

                {/* Divider */}
                {user && <div className="border-t border-white/5 my-2" />}

                {/* Notifications row (auth only) */}
                {user && (
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setNotifOpen(o => !o)}
                            className={`group w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150 rounded-[3px] ${notifOpen ? 'bg-white/8 text-white' : 'text-gray-400 hover:text-white hover:bg-white/4'}`}
                        >
                            <Bell className={`h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 ${notifOpen ? 'opacity-100' : ''}`} strokeWidth={1.5} />
                            Notifications
                            {unread > 0 && (
                                <span className="ml-auto bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                    {unread > 9 ? '9+' : unread}
                                </span>
                            )}
                        </button>

                        {/* Notification panel — slides out to the right of sidebar */}
                        {notifOpen && (
                            <div className="fixed left-55 top-0 h-screen w-80 bg-[#161616] border-l border-white/6 flex flex-col z-50 shadow-2xl">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
                                    <span className="text-sm font-black text-white">Notifications</span>
                                    <div className="flex items-center gap-2">
                                        {unread > 0 && (
                                            <button onClick={handleMarkAllRead} className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">
                                                Mark all read
                                            </button>
                                        )}
                                        <button onClick={() => setNotifOpen(false)} className="p-1 text-gray-500 hover:text-white transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
                                            <Bell className="h-6 w-6 mb-2 opacity-40" />
                                            No notifications yet
                                        </div>
                                    ) : notifications.map(n => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleNotifClick(n)}
                                            className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/4 hover:bg-white/4 transition-colors ${!n.is_read ? 'bg-white/2' : ''}`}
                                        >
                                            <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-semibold leading-snug ${n.is_read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                                                {n.body && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>}
                                                <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
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
                <div className="px-3 pb-3">
                    <Link
                        href="/auctions/create"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-400 text-black text-sm font-black hover:bg-amber-300 transition-colors rounded-[3px]"
                    >
                        <Plus className="h-4 w-4" />
                        Create Listing
                    </Link>
                </div>
            )}

            {/* User section */}
            <div className="border-t border-white/6 p-3 shrink-0">
                {!loading && user ? (
                    <div className="space-y-0.5">
                        {/* Avatar row */}
                        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
                            <div className="h-7 w-7 bg-amber-400 text-black flex items-center justify-center font-black text-xs shrink-0 rounded-xs">
                                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
                                    profile?.username?.[0]?.toUpperCase() ||
                                    user.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-white text-xs font-semibold truncate leading-tight">
                                    {profile?.full_name || profile?.username || user.email?.split('@')[0]}
                                </p>
                                <p className="text-gray-500 text-[10px] truncate">{user.email}</p>
                            </div>
                        </div>
                        <Link
                            href="/settings"
                            className="group flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/4 transition-all rounded-[3px]"
                        >
                            <Settings className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.5} />
                            Settings
                        </Link>
                        <button
                            onClick={() => signOut()}
                            className="group w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/4 transition-all rounded-[3px]"
                        >
                            <LogOut className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" strokeWidth={1.5} />
                            Sign out
                        </button>
                    </div>
                ) : !loading ? (
                    <div className="space-y-2 px-1">
                        <Link
                            href="/login"
                            className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white border border-white/10 hover:border-white/20 transition-all rounded-[3px]"
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
                ) : null}
            </div>
        </aside>
    );
}


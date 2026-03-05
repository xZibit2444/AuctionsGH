'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Gavel, Trophy, Clock, Info } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string | null;
    auction_id: string | null;
    is_read: boolean;
    created_at: string;
}

const typeIcon = (type: string) => {
    switch (type) {
        case 'new_bid': return <Gavel className="h-4 w-4 text-gray-500" strokeWidth={1.5} />;
        case 'auction_won': return <Trophy className="h-4 w-4 text-black" strokeWidth={1.5} />;
        case 'outbid': return <Gavel className="h-4 w-4 text-red-400" strokeWidth={1.5} />;
        case 'auction_ended': return <Clock className="h-4 w-4 text-gray-400" strokeWidth={1.5} />;
        default: return <Info className="h-4 w-4 text-gray-400" strokeWidth={1.5} />;
    }
};

function timeAgo(dateStr: string) {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 60) return 'just now';
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('notifications') as any)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        const items = (data ?? []) as Notification[];
        setNotifications(items);
        setUnread(items.filter((n) => !n.is_read).length);
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = async () => {
        if (!user || unread === 0) return;
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('notifications') as any)
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const handleOpen = () => {
        setOpen((o) => !o);
        if (!open && unread > 0) {
            // Mark all read after a short delay (let the panel animate in first)
            setTimeout(markAllRead, 600);
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleOpen}
                className="relative p-2 text-gray-400 hover:text-black transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-black rounded-full flex items-center justify-center">
                        {unread > 9 && (
                            <span className="sr-only">{unread} unread</span>
                        )}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 shadow-lg z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-xs font-black text-black uppercase tracking-widest">Notifications</p>
                        {unread > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[10px] font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell className="h-6 w-6 text-gray-200 mx-auto mb-2" strokeWidth={1} />
                                <p className="text-xs text-gray-400">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const inner = (
                                    <div className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-gray-50/60' : ''}`}>
                                        <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug truncate ${n.is_read ? 'text-gray-600' : 'font-semibold text-black'}`}>
                                                {n.title}
                                            </p>
                                            {n.body && (
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                                            )}
                                            <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                        {!n.is_read && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-black shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                );

                                return n.auction_id ? (
                                    <Link key={n.id} href={`/auctions/${n.auction_id}`} onClick={() => setOpen(false)}>
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={n.id}>{inner}</div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5">
                        <Link
                            href="/settings#notifications"
                            onClick={() => setOpen(false)}
                            className="text-[10px] font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                        >
                            Notification settings →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

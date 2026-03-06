'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Gavel, Trophy, Clock, Info, MessageCircle, Tag } from 'lucide-react';
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
        case 'new_bid': return <Gavel className="h-4 w-4 text-gray-500" strokeWidth={1.5} />;
        case 'auction_won': return <Trophy className="h-4 w-4 text-black" strokeWidth={1.5} />;
        case 'outbid': return <Gavel className="h-4 w-4 text-red-400" strokeWidth={1.5} />;
        case 'auction_ended': return <Clock className="h-4 w-4 text-gray-400" strokeWidth={1.5} />;
        case 'new_message': return <MessageCircle className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />;
        case 'new_offer': return <Tag className="h-4 w-4 text-amber-500" strokeWidth={1.5} />;
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

    // Fetch initially
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Subscribe to realtime inserts
    useEffect(() => {
        if (!user) return;
        const supabase = createClient();

        const channel = supabase
            .channel('realtime:notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
                    setUnread((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

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
        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnread(0);
        // Persist to DB via server action
        const result = await markAllReadAction();
        if (result.error) {
            // Revert optimistic update if DB write failed
            fetchNotifications();
        }
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
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-300">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
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

                                // Build the destination URL. Offer notifications scroll straight to the offer panel.
                                const href = n.order_id
                                    ? `/orders/${n.order_id}`
                                    : n.auction_id && n.type === 'new_offer'
                                    ? `/auctions/${n.auction_id}#offer-panel`
                                    : n.auction_id
                                    ? `/auctions/${n.auction_id}`
                                    : null;

                                // Use window.location.href so navigation is always a full
                                // page load — bypasses any router/RouteRefresher race conditions.
                                return href ? (
                                    <div
                                        key={n.id}
                                        role="link"
                                        tabIndex={0}
                                        className="cursor-pointer"
                                        onClick={() => { setOpen(false); window.location.href = href; }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { setOpen(false); window.location.href = href; } }}
                                    >
                                        {inner}
                                    </div>
                                ) : (
                                    <div key={n.id}>{inner}</div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5">
                        <button
                            onClick={() => { setOpen(false); window.location.href = '/settings#notifications'; }}
                            className="text-[10px] font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                        >
                            Notification settings →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserAvailability } from '@/hooks/useUserAvailability';
import { MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TOAST_LINGER_MS = 3 * 60 * 1000;
const CHAT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_VISIBLE_TOASTS = 3;

interface ChatToast {
    /** Thread key: order:<orderId> or offer:<auctionId> */
    id: string;
    /** Latest notification id this toast represents */
    notificationId: string;
    title: string;
    body: string;
    href: string;
    receivedAt: number;
}

interface MessageNotification {
    id: string;
    title: string;
    body: string | null;
    auction_id: string | null;
    order_id: string | null;
    /** Buyer side of an offer chat thread; NULL on legacy rows written before
     *  thread scoping existed. */
    offer_buyer_id: string | null;
    created_at: string;
}

function threadKeyOf(n: { order_id: string | null; auction_id: string | null; offer_buyer_id?: string | null }): string | null {
    if (n.order_id) return `order:${n.order_id}`;
    // Legacy offer notifications without a buyer id share one 'legacy'
    // thread per listing rather than being merged into any buyer's thread.
    if (n.auction_id) return `offer:${n.auction_id}:${n.offer_buyer_id ?? 'legacy'}`;
    return null;
}

function dismissedStorageKey(userId: string) {
    return `chatToastDismissed:${userId}`;
}

/** Map of threadKey -> latest dismissed notification id, per user, per device. */
function readDismissed(userId: string): Record<string, string> {
    try {
        const raw = window.localStorage.getItem(dismissedStorageKey(userId));
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed as Record<string, string>;
    } catch {
        return {};
    }
}

function rememberDismissed(userId: string, threadKey: string, notificationId: string) {
    try {
        const map = readDismissed(userId);
        map[threadKey] = notificationId;
        window.localStorage.setItem(dismissedStorageKey(userId), JSON.stringify(map));
    } catch {
        // Storage unavailable: dismissal just won't persist across visits.
    }
}

/**
 * Popup that asks a signed-in user to come to their deal chat. Covers two
 * moments: when they OPEN the site with unread deal messages (order chats and
 * offer Order & Chat threads), and when a new message arrives while they
 * browse. Closing the popup with X (or opening the chat) is remembered per
 * thread, so it only comes back when a newer message arrives; the 3-minute
 * auto-hide alone does not dismiss it permanently.
 */
export default function FloatingChatToast() {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const pathname = usePathname();
    const isUserAvailable = useUserAvailability();
    const [toasts, setToasts] = useState<ChatToast[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const pendingToastsRef = useRef<ChatToast[]>([]);
    const latestNotifByThreadRef = useRef<Map<string, string>>(new Map());
    const activePathnameRef = useRef(pathname);
    const flushPendingToastsRef = useRef<() => void>(() => {});
    const dismissRef = useRef<(id: string) => void>(() => {});

    const flushPendingToasts = useCallback(() => {
        if (!isUserAvailable || pendingToastsRef.current.length === 0) return;

        const toDisplay: ChatToast[] = [];

        setToasts((prev) => {
            const next = [...prev];
            const queue = [...pendingToastsRef.current];

            while (next.length < MAX_VISIBLE_TOASTS && queue.length > 0) {
                const nextToast = queue.shift();
                if (!nextToast || next.some((toast) => toast.id === nextToast.id)) continue;

                next.push(nextToast);
                toDisplay.push(nextToast);
            }

            pendingToastsRef.current = queue;
            return next;
        });

        toDisplay.forEach((toast) => {
            const existingTimer = timersRef.current.get(toast.id);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            const timer = setTimeout(() => dismissRef.current(toast.id), TOAST_LINGER_MS);
            timersRef.current.set(toast.id, timer);
        });
    }, [isUserAvailable]);

    // `remember` records an explicit dismissal (X click or opening the chat)
    // so the same messages do not pop up again; the auto-hide timer calls this
    // without it, so an ignored popup re-asks on the next visit.
    const dismiss = useCallback((id: string, opts?: { remember?: boolean }) => {
        if (opts?.remember && userId) {
            const notificationId = latestNotifByThreadRef.current.get(id);
            if (notificationId) rememberDismissed(userId, id, notificationId);
        }

        pendingToastsRef.current = pendingToastsRef.current.filter((toast) => toast.id !== id);

        setToasts((prev) => prev.filter((toast) => toast.id !== id));

        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }

        if (isUserAvailable) {
            setTimeout(() => flushPendingToastsRef.current(), 0);
        }
    }, [isUserAvailable, userId]);

    const scheduleDismiss = useCallback((id: string) => {
        const existingTimer = timersRef.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => dismissRef.current(id), TOAST_LINGER_MS);
        timersRef.current.set(id, timer);
    }, []);

    const enqueueToast = useCallback((toast: ChatToast) => {
        latestNotifByThreadRef.current.set(toast.id, toast.notificationId);
        pendingToastsRef.current = pendingToastsRef.current.filter((item) => item.id !== toast.id);

        let displayedImmediately = false;

        setToasts((prev) => {
            const existing = prev.find((item) => item.id === toast.id);
            if (existing) {
                if (existing.notificationId === toast.notificationId) return prev;
                // Newer message on a thread already showing: refresh its card.
                displayedImmediately = true;
                return prev.map((item) => (item.id === toast.id ? toast : item));
            }
            if (isUserAvailable && prev.length < MAX_VISIBLE_TOASTS) {
                displayedImmediately = true;
                return [...prev, toast];
            }

            return prev;
        });

        if (displayedImmediately) {
            scheduleDismiss(toast.id);
            return;
        }

        pendingToastsRef.current = [...pendingToastsRef.current, toast];
    }, [isUserAvailable, scheduleDismiss]);

    // Order chats link to the order page; offer threads link to the Order &
    // Chat deal page for that (listing, buyer) thread when an accepted offer
    // exists (fallback: the listing page).
    const resolveHref = useCallback(async (notification: MessageNotification): Promise<string | null> => {
        if (notification.order_id) return `/orders/${notification.order_id}`;
        if (!notification.auction_id || !userId) return null;

        const supabase = createClient();
        // Database types do not include auction_offers yet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from('auction_offers') as any)
            .select('id')
            .eq('auction_id', notification.auction_id)
            .eq('status', 'accepted')
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order('updated_at', { ascending: false })
            .limit(1);
        if (notification.offer_buyer_id) query = query.eq('buyer_id', notification.offer_buyer_id);
        const { data: offer } = await query.maybeSingle();

        return offer?.id ? `/offers/${offer.id}` : `/auctions/${notification.auction_id}`;
    }, [userId]);

    useEffect(() => {
        activePathnameRef.current = pathname;
        flushPendingToastsRef.current = flushPendingToasts;
        dismissRef.current = dismiss;
    }, [dismiss, flushPendingToasts, pathname]);

    // Hide a thread's popup while its chat page is already open. The chat
    // itself marks the notifications read, so the backlog will not re-ask.
    useEffect(() => {
        pendingToastsRef.current = pendingToastsRef.current.filter(
            (toast) => pathname !== toast.href
        );

        const matchingToastIds = toasts
            .filter((toast) => pathname === toast.href)
            .map((toast) => toast.id);

        if (matchingToastIds.length === 0) return;

        const timeout = setTimeout(() => {
            matchingToastIds.forEach((id) => dismiss(id));
        }, 0);

        return () => clearTimeout(timeout);
    }, [dismiss, pathname, toasts]);

    useEffect(() => {
        const interval = setInterval(() => {
            const cutoff = Date.now() - CHAT_MAX_AGE_MS;
            const dismissedIds: string[] = [];

            setToasts((prev) =>
                prev.filter((toast) => {
                    const shouldKeep = toast.receivedAt > cutoff;
                    if (!shouldKeep) dismissedIds.push(toast.id);
                    return shouldKeep;
                })
            );

            pendingToastsRef.current = pendingToastsRef.current.filter((toast) => toast.receivedAt > cutoff);

            dismissedIds.forEach((id) => {
                const timer = timersRef.current.get(id);
                if (timer) {
                    clearTimeout(timer);
                    timersRef.current.delete(id);
                }
            });
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        flushPendingToasts();
    }, [flushPendingToasts]);

    // On every full site visit, ask about unread deal messages - however old;
    // unread is unread - whose thread was not explicitly dismissed since its
    // latest message.
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const supabase = createClient();

        const loadBacklog = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('notifications') as any)
                .select('id, title, body, auction_id, order_id, offer_buyer_id, created_at')
                .eq('user_id', userId)
                .eq('type', 'new_message')
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(50);
            if (cancelled || !data) return;

            const dismissed = readDismissed(userId);
            const seenThreads = new Set<string>();
            for (const notification of data as MessageNotification[]) {
                const key = threadKeyOf(notification);
                if (!key || seenThreads.has(key)) continue;
                // Rows are newest-first: the first hit per thread is its latest.
                seenThreads.add(key);
                if (dismissed[key] === notification.id) continue;
                const href = await resolveHref(notification);
                if (cancelled) return;
                if (!href) continue;
                if (activePathnameRef.current === href) continue;
                enqueueToast({
                    id: key,
                    notificationId: notification.id,
                    title: notification.title,
                    body: notification.body ?? '',
                    href,
                    receivedAt: Date.now(),
                });
            }
        };

        void loadBacklog();
        return () => { cancelled = true; };
    }, [enqueueToast, resolveHref, userId]);

    // Live: a new deal message arriving while the user browses.
    useEffect(() => {
        if (!userId) return;

        let isMounted = true;
        const supabase = createClient();
        const timers = timersRef.current;

        const channel = supabase
            .channel(`floating-chat-toast:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    void (async () => {
                        if (!isMounted) return;

                        const notification = payload.new as MessageNotification & { type?: string };
                        if (notification.type !== 'new_message') return;
                        const key = threadKeyOf(notification);
                        if (!key) return;

                        const href = await resolveHref(notification);
                        if (!isMounted || !href) return;
                        if (activePathnameRef.current === href) return;

                        enqueueToast({
                            id: key,
                            notificationId: notification.id,
                            title: notification.title,
                            body: notification.body ?? '',
                            href,
                            receivedAt: Date.now(),
                        });
                    })();
                }
            )
            .subscribe((status, err) => {
                if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && err) {
                    console.error('FloatingChatToast subscription error:', status, err);
                }
            });

        return () => {
            isMounted = false;
            void supabase.removeChannel(channel);
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
            pendingToastsRef.current = [];
        };
    }, [enqueueToast, resolveHref, userId]);

    if (!userId || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="pointer-events-auto w-72 sm:w-80 rounded-2xl overflow-hidden bg-black text-white shadow-2xl"
                    style={{ animation: 'slideInRight 0.25s ease-out' }}
                >
                    <div className="flex items-start gap-3 px-4 pt-4 pb-2">
                        <div className="shrink-0 h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">
                                {toast.title}
                            </p>
                            <p className="text-sm text-gray-200 line-clamp-2 leading-snug">
                                {toast.body}
                            </p>
                        </div>
                        <button
                            onClick={() => dismiss(toast.id, { remember: true })}
                            className="shrink-0 text-gray-500 hover:text-white transition-colors -mt-0.5"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="px-4 pb-3 flex justify-end">
                        <Link
                            href={toast.href}
                            onClick={() => dismiss(toast.id, { remember: true })}
                            className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 transition-colors"
                        >
                            Open Chat →
                        </Link>
                    </div>
                </div>
            ))}

            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

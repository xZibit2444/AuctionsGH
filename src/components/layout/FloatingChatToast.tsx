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
    id: string;
    title: string;
    body: string;
    orderId: string;
    receivedAt: number;
}

export default function FloatingChatToast() {
    const { user } = useAuth();
    const pathname = usePathname();
    const isUserAvailable = useUserAvailability();
    const [toasts, setToasts] = useState<ChatToast[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const pendingToastsRef = useRef<ChatToast[]>([]);
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

    const dismiss = useCallback((id: string) => {
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
    }, [isUserAvailable]);

    const scheduleDismiss = useCallback((id: string) => {
        const existingTimer = timersRef.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => dismissRef.current(id), TOAST_LINGER_MS);
        timersRef.current.set(id, timer);
    }, []);

    const enqueueToast = useCallback((toast: ChatToast) => {
        pendingToastsRef.current = pendingToastsRef.current.filter((item) => item.id !== toast.id);

        let displayedImmediately = false;

        setToasts((prev) => {
            const deduped = prev.filter((item) => item.id !== toast.id);
            if (isUserAvailable && deduped.length < MAX_VISIBLE_TOASTS) {
                displayedImmediately = true;
                return [...deduped, toast];
            }

            return deduped;
        });

        if (displayedImmediately) {
            scheduleDismiss(toast.id);
            return;
        }

        pendingToastsRef.current = [...pendingToastsRef.current, toast];
    }, [isUserAvailable, scheduleDismiss]);

    useEffect(() => {
        activePathnameRef.current = pathname;
        flushPendingToastsRef.current = flushPendingToasts;
        dismissRef.current = dismiss;
    }, [dismiss, flushPendingToasts, pathname]);

    useEffect(() => {
        pendingToastsRef.current = pendingToastsRef.current.filter(
            (toast) => pathname !== `/orders/${toast.orderId}`
        );

        const matchingToastIds = toasts
            .filter((toast) => pathname === `/orders/${toast.orderId}`)
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

    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        const supabase = createClient();
        const timers = timersRef.current;

        const channel = supabase
            .channel(`floating-chat-toast:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (!isMounted) return;

                    const notification = payload.new as Record<string, string | null>;
                    if (notification.type !== 'new_message' || !notification.order_id) return;

                    if (activePathnameRef.current === `/orders/${notification.order_id}`) return;

                    enqueueToast({
                        id: notification.id as string,
                        title: notification.title as string,
                        body: notification.body ?? '',
                        orderId: notification.order_id as string,
                        receivedAt: Date.now(),
                    });
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
    }, [enqueueToast, user]);

    if (!user || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="pointer-events-auto w-72 sm:w-80 bg-black text-white shadow-2xl"
                    style={{ animation: 'slideInRight 0.25s ease-out' }}
                >
                    <div className="flex items-start gap-3 px-4 pt-4 pb-2">
                        <div className="shrink-0 h-8 w-8 bg-emerald-500/20 flex items-center justify-center">
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
                            onClick={() => dismiss(toast.id)}
                            className="shrink-0 text-gray-500 hover:text-white transition-colors -mt-0.5"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="px-4 pb-3 flex justify-end">
                        <Link
                            href={`/orders/${toast.orderId}`}
                            onClick={() => dismiss(toast.id)}
                            className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 transition-colors"
                        >
                            View Order →
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

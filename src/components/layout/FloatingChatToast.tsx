'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, X } from 'lucide-react';
import Link from 'next/link';

const TOAST_LINGER_MS = 3 * 60 * 1000;   // 3 minutes
const CHAT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ChatToast {
    id: string;
    title: string;
    body: string;
    orderId: string;
    receivedAt: number; // epoch ms
}

export default function FloatingChatToast() {
    const { user } = useAuth();
    const [toasts, setToasts] = useState<ChatToast[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    };

    // Purge toasts older than 24 hours every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const cutoff = Date.now() - CHAT_MAX_AGE_MS;
            setToasts((prev) => prev.filter((t) => t.receivedAt > cutoff));
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const supabase = createClient();

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
                    const n = payload.new as Record<string, string | null>;
                    if (n['type'] !== 'new_message' || !n['order_id']) return;

                    const toast: ChatToast = {
                        id: n['id'] as string,
                        title: n['title'] as string,
                        body: n['body'] ?? '',
                        orderId: n['order_id'] as string,
                        receivedAt: Date.now(),
                    };

                    setToasts((prev) => [...prev.slice(-2), toast]);

                    // Auto-dismiss after 3 minutes
                    const timer = setTimeout(() => dismiss(toast.id), TOAST_LINGER_MS);
                    timersRef.current.set(toast.id, timer);
                }
            )
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('FloatingChatToast subscription error:', status, err);
                }
            });

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [user]);

    if (toasts.length === 0) return null;

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

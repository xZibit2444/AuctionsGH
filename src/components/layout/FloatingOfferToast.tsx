'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { respondToOfferAction } from '@/app/actions/offer';
import { formatCurrency } from '@/lib/utils';
import { Tag, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';

const OFFER_LINGER_MS = 3 * 60 * 1000; // 3 minutes

interface OfferToast {
    id: string;         // offer id
    auctionId: string;
    amount: number;
    buyerName: string;
    auctionTitle: string;
    receivedAt: number;
}

export default function FloatingOfferToast() {
    const { user } = useAuth();
    const router = useRouter();
    const [toasts, setToasts] = useState<OfferToast[]>([]);
    const [responding, setResponding] = useState<string | null>(null);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    };

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        let isMounted = true;

        const channel = supabase
            .channel(`floating-offer-toast:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'auction_offers',
                    filter: `seller_id=eq.${user.id}`,
                },
                async (payload) => {
                    if (!isMounted) return;
                    const offer = payload.new as {
                        id: string;
                        auction_id: string;
                        buyer_id: string;
                        amount: number;
                        status: string;
                    };

                    if (offer.status !== 'pending') return;

                    // Fetch auction title + buyer name
                    const [auctionRes, buyerRes] = await Promise.all([
                        supabase
                            .from('auctions')
                            .select('title')
                            .eq('id', offer.auction_id)
                            .single(),
                        supabase
                            .from('profiles')
                            .select('full_name, username')
                            .eq('id', offer.buyer_id)
                            .single(),
                    ]);

                    if (!isMounted) return;

                    const auctionTitle = (auctionRes.data as any)?.title ?? 'your listing';
                    const bp = buyerRes.data as any;
                    const buyerName = bp
                        ? (bp.full_name || bp.username || 'A buyer')
                        : 'A buyer';

                    const toast: OfferToast = {
                        id: offer.id,
                        auctionId: offer.auction_id,
                        amount: offer.amount,
                        buyerName,
                        auctionTitle,
                        receivedAt: Date.now(),
                    };

                    setToasts((prev) => [...prev.slice(-2), toast]);

                    // Auto-dismiss after 3 minutes
                    const timer = setTimeout(() => dismiss(toast.id), OFFER_LINGER_MS);
                    timersRef.current.set(toast.id, timer);
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
        // dismiss is stable (defined outside useEffect) — no need in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleRespond = async (toast: OfferToast, response: 'accepted' | 'declined') => {
        setResponding(toast.id);
        const result = await respondToOfferAction(toast.id, response);
        setResponding(null);
        if (result.success) {
            dismiss(toast.id);
            if (response === 'accepted') {
                router.push(`/auctions/${toast.auctionId}`);
            }
        } else {
            alert(result.error ?? 'Something went wrong');
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-4 sm:left-6 z-50 flex flex-col gap-3 items-start pointer-events-none">
            {toasts.map((toast) => {
                const isLoading = responding === toast.id;
                const elapsed = Date.now() - toast.receivedAt;
                const progress = Math.max(0, 1 - elapsed / OFFER_LINGER_MS);

                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto w-72 sm:w-80 bg-white border border-amber-200 shadow-2xl"
                        style={{ animation: 'slideInLeft 0.25s ease-out' }}
                    >
                        {/* 3-minute countdown bar */}
                        <div className="h-1 bg-amber-100">
                            <OfferProgressBar durationMs={OFFER_LINGER_MS} />
                        </div>

                        <div className="px-4 pt-3 pb-2">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 bg-amber-100 flex items-center justify-center shrink-0">
                                        <Tag className="w-3.5 h-3.5 text-amber-700" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                            New Offer
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate max-w-42">
                                            {toast.auctionTitle}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismiss(toast.id)}
                                    className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 -mt-0.5"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Offer message */}
                            <p className="text-sm text-black font-medium leading-snug mb-3">
                                <span className="text-gray-500">{toast.buyerName}: </span>
                                &ldquo;Will you accept{' '}
                                <span className="font-black">{formatCurrency(toast.amount)}</span>{' '}
                                for this item?&rdquo;
                            </p>

                            {/* Yes / No — no other options */}
                            <div className="flex gap-2 pb-1">
                                <button
                                    onClick={() => handleRespond(toast, 'accepted')}
                                    disabled={!!responding}
                                    className="flex-1 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isLoading
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <CheckCircle2 className="h-3 w-3" />}
                                    Yes
                                </button>
                                <button
                                    onClick={() => handleRespond(toast, 'declined')}
                                    disabled={!!responding}
                                    className="flex-1 py-2.5 bg-white text-black border border-gray-200 text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isLoading
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <XCircle className="h-3 w-3 text-red-400" />}
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            <style>{`
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

/** Animates a progress bar that depletes over durationMs. */
function OfferProgressBar({ durationMs }: { durationMs: number }) {
    return (
        <div
            className="h-full bg-amber-400 origin-left"
            style={{
                animation: `depleteBar ${durationMs}ms linear forwards`,
            }}
        >
            <style>{`
                @keyframes depleteBar {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>
        </div>
    );
}

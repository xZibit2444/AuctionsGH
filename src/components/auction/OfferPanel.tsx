'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { makeOfferAction, respondToOfferAction } from '@/app/actions/offer';
import { formatCurrency } from '@/lib/utils';
import { Tag, CheckCircle2, XCircle, Loader2, Send } from 'lucide-react';

interface Offer {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    buyer_profile?: { full_name: string | null; username: string } | null;
}

interface OfferPanelProps {
    auctionId: string;
    isSeller: boolean;
    userId: string;
    auctionTitle: string;
    isActive?: boolean;
}

export default function OfferPanel({ auctionId, isSeller, userId, auctionTitle, isActive = true }: OfferPanelProps) {
    const router = useRouter();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [responding, setResponding] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [offers]);

    const fetchOffers = useCallback(async () => {
        const supabase = createClient();
        let q = (supabase.from('auction_offers') as any)
            .select('*, buyer_profile:profiles!buyer_id(full_name, username)')
            .eq('auction_id', auctionId)
            .order('created_at', { ascending: true });
        if (!isSeller) q = q.eq('buyer_id', userId);
        const { data } = await q;
        setOffers((data ?? []) as Offer[]);
        setLoading(false);
    }, [auctionId, isSeller, userId]);

    useEffect(() => { fetchOffers(); }, [fetchOffers]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`offer-chat:${auctionId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'auction_offers',
                filter: `auction_id=eq.${auctionId}`,
            }, () => { void fetchOffers(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [auctionId, fetchOffers]);

    const handleSendOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseFloat(amount.replace(/,/g, ''));
        if (!parsed || parsed <= 0) { setFormError('Enter a valid amount'); return; }
        setSubmitting(true);
        setFormError('');
        const result = await makeOfferAction(auctionId, parsed);
        setSubmitting(false);
        if (!result.success) setFormError(result.error ?? 'Failed to send offer');
        else { setAmount(''); void fetchOffers(); }
    };

    const handleRespond = async (offerId: string, response: 'accepted' | 'declined') => {
        setResponding(offerId);
        const result = await respondToOfferAction(offerId, response);
        setResponding(null);
        if (!result.success) alert(result.error ?? 'Something went wrong');
        void fetchOffers();
        if (result.success && response === 'accepted') router.refresh();
    };

    if (loading) return null;
    // Don't render at all if not seller and no offers exist and auction is inactive
    if (!isSeller && !isActive && offers.length === 0) return null;
    if (isSeller && !isActive && offers.length === 0) return null;

    const hasPending = !isSeller && offers.some((o) => o.status === 'pending');

    return (
        <div id="offer-panel" className="border border-gray-200 bg-white mt-4">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-black">
                <Tag className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[11px] font-black text-white uppercase tracking-widest">
                    {isSeller ? 'Buyer Offers' : 'Make an Offer'}
                </p>
            </div>

            {/* Chat messages */}
            <div className="max-h-60 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
                {offers.length === 0 ? (
                    <div className="py-8 text-center">
                        <Tag className="h-6 w-6 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">
                            {isSeller
                                ? 'No offers yet. Buyers can send you a fixed-price offer.'
                                : 'Send the seller a price offer below.'}
                        </p>
                    </div>
                ) : (
                    offers.map((o) => {
                        const isMine = o.buyer_id === userId;
                        const buyerName = o.buyer_profile
                            ? (o.buyer_profile.full_name || o.buyer_profile.username || 'Buyer')
                            : 'Buyer';
                        const isResponding = responding === o.id;

                        return (
                            <div key={o.id} className="space-y-1.5">
                                {/* Label for seller view */}
                                {isSeller && (
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{buyerName}</p>
                                )}

                                {/* Offer bubble */}
                                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[82%] px-4 py-3 text-sm leading-snug ${
                                        isMine
                                            ? 'bg-black text-white'
                                            : 'bg-white border border-gray-200 text-black'
                                    }`}>
                                        <p>
                                            Will you accept{' '}
                                            <span className="font-bold">{formatCurrency(o.amount)}</span>{' '}
                                            for this item?
                                        </p>
                                        <p className="text-[10px] mt-1.5 opacity-50 text-right">
                                            {new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Seller Yes / No buttons — only on pending, only for seller */}
                                {isSeller && o.status === 'pending' && (
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleRespond(o.id, 'accepted')}
                                            disabled={!!responding}
                                            className="flex-1 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {isResponding
                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : <CheckCircle2 className="h-3 w-3" />}
                                            Yes
                                        </button>
                                        <button
                                            onClick={() => handleRespond(o.id, 'declined')}
                                            disabled={!!responding}
                                            className="flex-1 py-2 bg-white text-black border border-gray-200 text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {isResponding
                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : <XCircle className="h-3 w-3 text-red-400" />}
                                            No
                                        </button>
                                    </div>
                                )}

                                {/* Response bubble */}
                                {o.status !== 'pending' && (
                                    <div className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[82%] px-4 py-2.5 text-sm ${
                                            o.status === 'accepted'
                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                                : 'bg-red-50 border border-red-100 text-red-700'
                                        }`}>
                                            {o.status === 'accepted'
                                                ? '✓ Yes — offer accepted!'
                                                : '✗ No — offer declined.'}
                                        </div>
                                    </div>
                                )}

                                {/* Checkout CTA for buyer on accepted offer */}
                                {!isSeller && o.status === 'accepted' && (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => router.push(`/checkout/${auctionId}`)}
                                            className="mt-1 px-4 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 className="h-3 w-3" />
                                            Proceed to Checkout →
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input area — buyer only, auction must be active */}
            {!isSeller && isActive && (
                <form onSubmit={handleSendOffer} className="border-t border-gray-200 bg-white">
                    {formError && (
                        <p className="px-4 pt-2 text-[11px] text-red-500 font-semibold">{formError}</p>
                    )}
                    {hasPending && (
                        <p className="px-4 pt-2 text-[10px] text-amber-600 italic">
                            Sending a new offer will replace your pending one.
                        </p>
                    )}
                    <div className="p-3 flex gap-2">
                        <div className={`flex flex-1 items-center border transition-colors focus-within:border-black ${
                            formError ? 'border-red-400' : 'border-gray-200'
                        }`}>
                            <span className="px-2.5 py-2.5 text-xs font-semibold text-gray-500 border-r border-gray-200 bg-gray-50 select-none">GHS</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); setFormError(''); }}
                                placeholder="Your offer amount"
                                className="flex-1 px-3 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!amount || submitting}
                            className="px-4 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {submitting
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Send className="h-3.5 w-3.5" />}
                            Offer
                        </button>
                    </div>
                    <p className="px-4 pb-2.5 text-[10px] text-gray-400 italic">
                        Sent as: &ldquo;Will you accept GHS [amount] for this item?&rdquo;
                    </p>
                </form>
            )}

            {/* Seller footer note */}
            {isSeller && (
                <div className="border-t border-gray-100 px-4 py-2.5">
                    <p className="text-[10px] text-gray-400 text-center">You can only respond Yes or No to each offer.</p>
                </div>
            )}
        </div>
    );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Send } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { markChatNotificationsReadAction } from '@/app/actions/notifications';

export interface OfferMessage {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    sender_id: string;
    body: string;
    created_at: string;
}

interface OfferChatThreadProps {
    auctionId: string;
    buyerId: string;
    userId: string;
    isSeller: boolean;
    /** First name of the other party, used in labels and placeholders */
    otherPartyName: string;
}

/**
 * Chat thread for one (auction, buyer) pair, backed by
 * auction_offer_messages. Used on the /offers/[id] Deal & Chat page and on
 * the /chat/[auctionId] listing chat, so a conversation that starts before an
 * offer carries over into the deal room unchanged.
 */
export default function OfferChatThread({ auctionId, buyerId, userId, isSeller, otherPartyName }: OfferChatThreadProps) {
    const [messages, setMessages] = useState<OfferMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight });
    }, [messages]);

    // Viewing the thread marks its new-message notifications read, so the bell
    // badge and the unread-messages popup only count messages not yet seen.
    // Scoped to this (auction, buyer) thread: other buyers' threads keep
    // their unread state.
    useEffect(() => {
        void markChatNotificationsReadAction({ auctionId, offerBuyerId: buyerId });
    }, [auctionId, buyerId, messages]);

    const fetchThread = useCallback(async () => {
        const supabase = createClient();
        // Database types in the repo do not include auction_offer_messages yet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('auction_offer_messages') as any)
            .select('id, auction_id, buyer_id, seller_id, sender_id, body, created_at')
            .eq('auction_id', auctionId)
            .eq('buyer_id', buyerId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data as OfferMessage[]);
        setLoading(false);
    }, [auctionId, buyerId]);

    useEffect(() => {
        void fetchThread();
    }, [fetchThread]);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`offer-thread:${auctionId}:${buyerId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'auction_offer_messages',
                filter: `auction_id=eq.${auctionId}`,
            }, (payload) => {
                const incoming = payload.new as OfferMessage;
                if (!incoming?.id || incoming.buyer_id !== buyerId) return;
                setMessages((prev) => {
                    if (prev.some((m) => m.id === incoming.id)) return prev;
                    const optIdx = prev.findIndex((m) => m.id.startsWith('opt-') && m.sender_id === incoming.sender_id && m.body === incoming.body);
                    const next = [...prev];
                    if (optIdx !== -1) next[optIdx] = incoming; else next.push(incoming);
                    return next;
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [auctionId, buyerId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || sending) return;

        setSending(true);
        setError('');
        setDraft('');

        const optimisticId = `opt-${Date.now()}`;
        const optimistic: OfferMessage = {
            id: optimisticId,
            auction_id: auctionId,
            buyer_id: buyerId,
            seller_id: isSeller ? userId : '',
            sender_id: userId,
            body: text,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            const res = await fetch('/api/offers/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isSeller
                    ? { auction_id: auctionId, body: text, buyer_id: buyerId }
                    : { auction_id: auctionId, body: text }),
            });
            const json = (await res.json().catch(() => ({}))) as { error?: string; message?: { id?: string } | string };
            if (!res.ok) {
                const msg = json?.error ?? (typeof json?.message === 'string' ? json.message : undefined) ?? 'Failed to send message';
                throw new Error(msg);
            }
            const realId = typeof json?.message === 'object' ? json.message?.id : undefined;
            if (realId) {
                setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, id: realId } : m)));
            }
            trackEvent('send_message', { context: 'offer_chat' });
        } catch (err) {
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setDraft(text);
            setError(err instanceof Error ? err.message : 'Failed to send. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
                    Chat with {otherPartyName}
                </h2>
            </div>

            <div ref={scrollRef} className="max-h-96 space-y-2 overflow-y-auto bg-gray-50 px-4 py-3">
                {loading && messages.length === 0 ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <p className="py-6 text-center text-xs text-gray-400">
                        {isSeller
                            ? `No messages yet. Text ${otherPartyName} to arrange payment and pickup.`
                            : 'No messages yet. Text the seller to arrange payment and pickup.'}
                    </p>
                ) : (
                    messages.map((m) => {
                        const mine = m.sender_id === userId;
                        return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[82%] px-3.5 py-2 text-sm leading-snug ${
                                    mine
                                        ? 'bg-black text-white'
                                        : 'bg-white border border-gray-200 text-black'
                                } ${m.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                                    <p className="whitespace-pre-wrap wrap-break-word">{m.body}</p>
                                    <p className="mt-1 text-right text-[10px] opacity-50">
                                        {m.id.startsWith('opt-')
                                            ? 'Sending…'
                                            : new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {error && (
                <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
                    {error}
                </p>
            )}

            <form onSubmit={(e) => { void handleSend(e); }} className="flex items-center gap-2 border-t border-gray-200 bg-white p-3">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={isSeller ? `Message ${otherPartyName}…` : 'Message the seller…'}
                    maxLength={2000}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400"
                />
                <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="shrink-0 px-4 py-2.5 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    aria-label="Send message"
                >
                    {sending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5" />}
                </button>
            </form>
        </div>
    );
}

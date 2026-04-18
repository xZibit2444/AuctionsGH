'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendOfferMessageAction } from '@/app/actions/offer';
import { Loader2, MessageCircle, Send } from 'lucide-react';

interface OfferMessage {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    sender_id: string;
    body: string;
    created_at: string;
}

interface OfferThreadChatProps {
    auctionId: string;
    buyerId: string;
    sellerId: string;
    userId: string;
    canChat: boolean;
}

export default function OfferThreadChat({
    auctionId,
    buyerId,
    sellerId,
    userId,
    canChat,
}: OfferThreadChatProps) {
    const [messages, setMessages] = useState<OfferMessage[]>([]);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sendError, setSendError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const supabase = createClient();

        const fetchHistory = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('auction_offer_messages') as any)
                .select('id, auction_id, buyer_id, seller_id, sender_id, body, created_at')
                .eq('auction_id', auctionId)
                .eq('buyer_id', buyerId)
                .order('created_at', { ascending: true })
                .limit(200);

            setMessages((data ?? []) as OfferMessage[]);
            setLoadingHistory(false);
        };

        void fetchHistory();

        const channel = supabase
            .channel(`offer-thread:${auctionId}:${buyerId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'auction_offer_messages',
                    filter: `auction_id=eq.${auctionId}`,
                },
                (payload) => {
                    const incoming = payload.new as OfferMessage;
                    if (incoming.buyer_id !== buyerId) return;

                    setMessages((prev) => {
                        if (prev.some((m) => m.id === incoming.id)) return prev;
                        const optimisticIdx = prev.findIndex(
                            (m) => m.id.startsWith('opt-') && m.sender_id === incoming.sender_id && m.body === incoming.body
                        );
                        if (optimisticIdx !== -1) {
                            const next = [...prev];
                            next[optimisticIdx] = incoming;
                            return next;
                        }
                        return [...prev, incoming];
                    });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [auctionId, buyerId]);

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const emptyLabel = useMemo(
        () => (userId === buyerId ? 'Ask the seller about the item or make another offer.' : 'Reply to the buyer or continue negotiating.'),
        [buyerId, userId]
    );

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed || sending || !canChat) return;

        setSending(true);
        setSendError('');
        setBody('');

        const optimisticId = `opt-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            {
                id: optimisticId,
                auction_id: auctionId,
                buyer_id: buyerId,
                seller_id: sellerId,
                sender_id: userId,
                body: trimmed,
                created_at: new Date().toISOString(),
            },
        ]);

        const result = await sendOfferMessageAction(auctionId, buyerId, trimmed);
        if (!result.success) {
            setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
            setBody(trimmed);
            setSendError(result.error ?? 'Failed to send message.');
        } else if (result.messageId) {
            setMessages((prev) => prev.map((message) => (
                message.id === optimisticId ? { ...message, id: result.messageId ?? optimisticId } : message
            )));
        }

        setSending(false);
    };

    return (
        <div className="border border-gray-200 bg-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-[11px] font-black text-black uppercase tracking-widest">Offer Chat</p>
            </div>

            <div className="max-h-56 overflow-y-auto px-4 py-4 bg-gray-50 space-y-2">
                {loadingHistory ? (
                    <div className="py-8 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="py-8 text-center">
                        <MessageCircle className="h-7 w-7 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">{emptyLabel}</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMine = message.sender_id === userId;
                        const isOptimistic = message.id.startsWith('opt-');

                        return (
                            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[82%] px-3.5 py-2.5 text-sm ${
                                    isMine
                                        ? 'bg-black text-white'
                                        : 'bg-white border border-gray-200 text-black'
                                } ${isOptimistic ? 'opacity-60' : ''}`}>
                                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                    <p className="text-[10px] mt-1.5 opacity-60 text-right">
                                        {isOptimistic ? 'Sending...' : formatTime(message.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {canChat ? (
                <form onSubmit={handleSend} className="border-t border-gray-200 bg-white">
                    {sendError && (
                        <p className="px-4 pt-2 text-[11px] text-red-500 font-semibold">{sendError}</p>
                    )}
                    <div className="p-3 flex gap-2 items-end">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={1}
                            maxLength={2000}
                            placeholder="Type your message..."
                            className="flex-1 resize-none border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black"
                        />
                        <button
                            type="submit"
                            disabled={!body.trim() || sending}
                            className="px-3 py-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Send
                        </button>
                    </div>
                </form>
            ) : (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center">Offer chat closed</p>
                </div>
            )}
        </div>
    );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendTradeInMessageAction } from '@/app/actions/tradeIn';
import { formatFirstNameLastInitial } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import { Loader2, MessageSquareText, RefreshCw, Send, Shuffle } from 'lucide-react';

interface TradeThread {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    offered_item: string;
    created_at: string;
    updated_at: string;
    buyer_profile?: {
        id: string;
        full_name: string | null;
        username: string;
        avatar_url: string | null;
    } | null;
}

interface TradeMessage {
    id: string;
    thread_id: string;
    sender_id: string;
    body: string;
    created_at: string;
}

interface TradeInPanelProps {
    auctionId: string;
    isSeller: boolean;
    userId?: string | null;
    auctionTitle: string;
    isActive?: boolean;
}

export default function TradeInPanel({
    auctionId,
    isSeller,
    userId,
    auctionTitle,
    isActive = true,
}: TradeInPanelProps) {
    const isLoggedIn = !!userId;
    const router = useRouter();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [threads, setThreads] = useState<TradeThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<TradeMessage[]>([]);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [offeredItem, setOfferedItem] = useState('');
    const [body, setBody] = useState('');

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
        [threads, selectedThreadId]
    );

    const fetchThreads = useCallback(async () => {
        if (!userId) {
            setLoadingThreads(false);
            return;
        }

        const supabase = createClient();
        const query = (supabase.from('auction_trade_threads') as never as {
            select: (query: string) => {
                eq: (field: string, value: string) => {
                    order: (field: string, options: { ascending: boolean }) => Promise<{ data: TradeThread[] | null }>;
                    eq: (field: string, value: string) => {
                        order: (field: string, options: { ascending: boolean }) => Promise<{ data: TradeThread[] | null }>;
                    };
                };
            };
        })
            .select('*, buyer_profile:profiles!buyer_id(id, full_name, username, avatar_url)')
            .eq('auction_id', auctionId);

        const result = isSeller
            ? await query.order('updated_at', { ascending: false })
            : await query.eq('buyer_id', userId).order('updated_at', { ascending: false });

        const nextThreads = result.data ?? [];
        setThreads(nextThreads);
        setLoadingThreads(false);

        if (nextThreads.length === 0) {
            setSelectedThreadId(null);
            setMessages([]);
            return;
        }

        setSelectedThreadId((current) =>
            current && nextThreads.some((thread) => thread.id === current) ? current : nextThreads[0].id
        );
    }, [auctionId, isSeller, userId]);

    const fetchMessages = useCallback(async (threadId: string) => {
        setLoadingMessages(true);
        const supabase = createClient();
        const { data } = await (supabase.from('auction_trade_messages') as never as {
            select: (query: string) => {
                eq: (field: string, value: string) => {
                    order: (field: string, options: { ascending: boolean }) => Promise<{ data: TradeMessage[] | null }>;
                };
            };
        })
            .select('id, thread_id, sender_id, body, created_at')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        setMessages(data ?? []);
        setLoadingMessages(false);
    }, []);

    useEffect(() => {
        queueMicrotask(() => {
            void fetchThreads();
        });
    }, [fetchThreads]);

    useEffect(() => {
        if (!selectedThreadId) return;
        queueMicrotask(() => {
            void fetchMessages(selectedThreadId);
        });
    }, [fetchMessages, selectedThreadId]);

    useEffect(() => {
        const supabase = createClient();

        const threadChannel = supabase
            .channel(`trade-threads:${auctionId}:${userId ?? 'guest'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'auction_trade_threads', filter: `auction_id=eq.${auctionId}` },
                () => { void fetchThreads(); }
            )
            .subscribe();

        return () => { void supabase.removeChannel(threadChannel); };
    }, [auctionId, fetchThreads, userId]);

    useEffect(() => {
        if (!selectedThreadId) return;
        const supabase = createClient();

        const messageChannel = supabase
            .channel(`trade-messages:${selectedThreadId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'auction_trade_messages', filter: `thread_id=eq.${selectedThreadId}` },
                (payload) => {
                    const incoming = payload.new as TradeMessage;
                    setMessages((prev) => {
                        if (prev.some((message) => message.id === incoming.id)) return prev;
                        return [...prev, incoming];
                    });
                }
            )
            .subscribe();

        return () => { void supabase.removeChannel(messageChannel); };
    }, [selectedThreadId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedThreadId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoggedIn) {
            router.push(`/login?redirectTo=/auctions/${auctionId}`);
            return;
        }

        const trimmedBody = body.trim();
        if (!trimmedBody || sending) return;
        if (!selectedThreadId && !offeredItem.trim()) {
            setError('Add the item you want to trade in before sending the message.');
            return;
        }

        setSending(true);
        setError('');

        const optimisticId = `opt-${Date.now()}`;
        const optimisticMessage: TradeMessage = {
            id: optimisticId,
            thread_id: selectedThreadId ?? 'pending',
            sender_id: userId!,
            body: trimmedBody,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setBody('');

        const result = await sendTradeInMessageAction(
            selectedThreadId
                ? { threadId: selectedThreadId, body: trimmedBody }
                : { auctionId, offeredItem, body: trimmedBody }
        );

        if (!result.success) {
            setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
            setBody(trimmedBody);
            setError(result.error ?? 'Failed to send trade-in message.');
        } else {
            await fetchThreads();
            if (result.threadId) {
                setSelectedThreadId(result.threadId);
                await fetchMessages(result.threadId);
            }
        }

        setSending(false);
    };

    if (!isActive && threads.length === 0) return null;

    const otherPartyName = isSeller
        ? formatFirstNameLastInitial(selectedThread?.buyer_profile?.full_name ?? selectedThread?.buyer_profile?.username)
        : 'Seller';

    return (
        <div id="trade-in-panel" className="border border-gray-200 bg-white mt-4 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-black">
                <Shuffle className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[11px] font-black text-white uppercase tracking-widest">Private Trade-In Chat</p>
            </div>

            {loadingThreads ? (
                <div className="py-12 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
            ) : !isLoggedIn ? (
                <div className="p-5 text-center">
                    <MessageSquareText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-black">Ask the seller about a trade-in privately.</p>
                    <p className="text-xs text-gray-400 mt-1">Log in first so the seller can reply to you.</p>
                </div>
            ) : isSeller && threads.length === 0 ? (
                <div className="p-5 text-center">
                    <MessageSquareText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-black">No trade-in messages yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Interested buyers will appear here privately when they propose a swap.</p>
                </div>
            ) : (
                <div className={`grid ${isSeller ? 'md:grid-cols-[240px_minmax(0,1fr)]' : 'grid-cols-1'} min-h-[420px]`}>
                    {isSeller && (
                        <div className="border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
                            {threads.map((thread) => {
                                const buyerName = formatFirstNameLastInitial(thread.buyer_profile?.full_name ?? thread.buyer_profile?.username);
                                const active = thread.id === selectedThreadId;
                                return (
                                    <button
                                        key={thread.id}
                                        onClick={() => setSelectedThreadId(thread.id)}
                                        className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${active ? 'bg-white' : 'hover:bg-white/70'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                src={thread.buyer_profile?.avatar_url}
                                                name={buyerName || 'Buyer'}
                                                size="sm"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-black truncate">{buyerName || 'Buyer'}</p>
                                                <p className="text-[11px] text-gray-400 truncate">{thread.offered_item}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex flex-col min-h-[420px]">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                {selectedThread ? (isSeller ? 'Trade proposal' : 'Your trade offer') : 'New trade proposal'}
                            </p>
                            <p className="text-sm font-semibold text-black mt-1">
                                {selectedThread?.offered_item || 'Tell the seller what item you want to trade in'}
                            </p>
                            {selectedThread && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {isSeller ? `Conversation with ${otherPartyName || 'buyer'}` : `Private conversation about ${auctionTitle}`}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                            {selectedThreadId && loadingMessages ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <MessageSquareText className="h-8 w-8 text-gray-200 mb-3" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No messages yet</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {selectedThread ? 'Start the trade-in conversation below.' : 'Send the seller your first private trade-in message below.'}
                                    </p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isMine = message.sender_id === userId;
                                    return (
                                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${isMine ? 'bg-black text-white' : 'bg-white border border-gray-200 text-black'}`}>
                                                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                                <p className={`text-[10px] mt-1 ${isMine ? 'text-gray-400' : 'text-gray-300'}`}>
                                                    {message.id.startsWith('opt-')
                                                        ? 'Sending...'
                                                        : new Date(message.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {isActive || selectedThreadId ? (
                            <form onSubmit={handleSend} className="border-t border-gray-200 bg-white">
                                {error && (
                                    <div className="px-4 pt-3 text-xs font-semibold text-red-600">{error}</div>
                                )}
                                {!selectedThreadId && (
                                    <div className="px-4 pt-4">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                            What are you offering to trade?
                                        </label>
                                        <input
                                            value={offeredItem}
                                            onChange={(e) => setOfferedItem(e.target.value)}
                                            placeholder="Example: iPhone 13 128GB plus cash"
                                            className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black"
                                        />
                                    </div>
                                )}
                                <div className="p-4 flex gap-2">
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        rows={2}
                                        maxLength={2000}
                                        placeholder={isSeller ? 'Reply privately about the trade...' : 'Describe the condition of your item and any cash difference...'}
                                        className="flex-1 resize-none border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!body.trim() || sending}
                                        className="self-end inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50"
                                    >
                                        {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                        Send
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    Trade-in chat closed
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

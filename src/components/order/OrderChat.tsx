'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendMessageAction } from '@/app/actions/chat';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

interface Message {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
}

interface OrderChatProps {
    orderId: string;
    userId: string;
    /** First name of the other party shown in the header */
    otherPartyName: string;
    /** When true, the input is hidden and a delivery-complete notice is shown */
    isCompleted?: boolean;
}

export default function OrderChat({ orderId, userId, otherPartyName, isCompleted = false }: OrderChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const supabase = createClient();

        const fetchHistory = async () => {
            const { data } = await supabase
                .from('order_messages')
                .select('id, sender_id, body, created_at')
                .eq('order_id', orderId)
                .order('created_at', { ascending: true })
                .limit(200);
            if (data) setMessages(data as Message[]);
            setLoadingHistory(false);
        };

        fetchHistory();

        const channel = supabase
            .channel(`order-chat:${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_messages',
                    filter: `order_id=eq.${orderId}`,
                },
                (payload) => {
                    const incoming = payload.new as Message;
                    setMessages((prev) => {
                        // Already present by real ID — skip
                        if (prev.some((m) => m.id === incoming.id)) return prev;
                        // Replace a matching optimistic message to avoid duplicate keys
                        // when the realtime event races the optimistic ID swap
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
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed || sending) return;

        setSending(true);
        setSendError('');
        setBody('');

        // Optimistic insert with a temporary ID
        const optimisticId = `opt-${Date.now()}`;
        const optimistic: Message = {
            id: optimisticId,
            sender_id: userId,
            body: trimmed,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        const result = await sendMessageAction(orderId, trimmed);

        if (!result.success) {
            // Roll back and restore the typed text
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setBody(trimmed);
            setSendError(result.error || 'Failed to send. Please try again.');
        } else if (result.messageId) {
            // Swap the temp ID for the real UUID so the incoming Realtime event deduplicates correctly
            setMessages((prev) =>
                prev.map((m) => (m.id === optimisticId ? { ...m, id: result.messageId! } : m))
            );
        }

        setSending(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend(e as unknown as React.FormEvent);
        }
    };

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const formatDayLabel = (iso: string) => {
        const d = new Date(iso);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const grouped: { dayLabel: string; msgs: Message[] }[] = [];
    for (const msg of messages) {
        const label = formatDayLabel(msg.created_at);
        const last = grouped[grouped.length - 1];
        if (last && last.dayLabel === label) last.msgs.push(msg);
        else grouped.push({ dayLabel: label, msgs: [msg] });
    }

    return (
        <div className="flex flex-col border border-gray-200 bg-white" style={{ height: '520px' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 bg-black text-white shrink-0">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                    <p className="text-sm font-black uppercase tracking-widest">Order Chat</p>
                    <p className="text-[10px] text-gray-400">with {otherPartyName}</p>
                </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
                {loadingHistory ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageCircle className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start the conversation below.</p>
                    </div>
                ) : (
                    grouped.map((group) => (
                        <div key={group.dayLabel}>
                            <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                                    {group.dayLabel}
                                </span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {group.msgs.map((msg, i) => {
                                const isMine = msg.sender_id === userId;
                                const stackedWithPrev = group.msgs[i - 1]?.sender_id === msg.sender_id;
                                const isOptimistic = msg.id.startsWith('opt-');

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${stackedWithPrev ? 'mt-0.5' : 'mt-3'}`}
                                    >
                                        <div
                                            className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
                                                isMine
                                                    ? 'bg-black text-white rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl'
                                                    : 'bg-white border border-gray-200 text-black rounded-tr-2xl rounded-br-2xl rounded-tl-sm rounded-bl-2xl'
                                            } ${isOptimistic ? 'opacity-60' : ''}`}
                                        >
                                            <p className="whitespace-pre-wrap wrap-break-word">{msg.body}</p>
                                            <p className="text-[10px] mt-1 text-gray-400 text-right">
                                                {isOptimistic ? 'Sendingâ€¦' : formatTime(msg.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            {isCompleted ? (
                <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-center">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Chat closed · delivery completed
                    </p>
                </div>
            ) : (
            <form onSubmit={handleSend} className="shrink-0 border-t border-gray-200 bg-white">
                {sendError && (
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold text-red-600 bg-red-50 border-b border-red-100">
                        {sendError}
                    </div>
                )}
                <div className="p-3 flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message... (Enter to send)"
                        rows={1}
                        maxLength={2000}
                        className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black placeholder:text-gray-400"
                        style={{ maxHeight: '120px', overflowY: 'auto' }}
                    />
                    <button
                        type="submit"
                        disabled={!body.trim() || sending}
                        className="shrink-0 w-10 h-10 flex items-center justify-center bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </form>
            )}
        </div>
    );
}

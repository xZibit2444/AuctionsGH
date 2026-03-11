'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendAuctionCommentAction } from '@/app/actions/comments';
import Avatar from '@/components/ui/Avatar';
import { formatFirstNameLastInitial } from '@/lib/utils';
import { Loader2, MessageSquare, Send } from 'lucide-react';

interface AuctionComment {
    id: string;
    auction_id: string;
    user_id: string;
    body: string;
    created_at: string;
    profile?: {
        id: string;
        full_name: string | null;
        username: string;
        avatar_url: string | null;
    } | null;
}

interface AuctionCommentsProps {
    auctionId: string;
    currentUserId?: string | null;
}

export default function AuctionComments({ auctionId, currentUserId }: AuctionCommentsProps) {
    const router = useRouter();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [comments, setComments] = useState<AuctionComment[]>([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const supabase = createClient();

        const fetchComments = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('auction_comments') as any)
                .select('id, auction_id, user_id, body, created_at, profile:profiles!auction_comments_user_id_fkey(id, full_name, username, avatar_url)')
                .eq('auction_id', auctionId)
                .order('created_at', { ascending: true })
                .limit(200);

            setComments((data ?? []) as AuctionComment[]);
            setLoading(false);
        };

        queueMicrotask(() => {
            void fetchComments();
        });

        const channel = supabase
            .channel(`auction-comments:${auctionId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'auction_comments', filter: `auction_id=eq.${auctionId}` },
                async (payload) => {
                    const inserted = payload.new as AuctionComment;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data } = await (supabase.from('auction_comments') as any)
                        .select('id, auction_id, user_id, body, created_at, profile:profiles!auction_comments_user_id_fkey(id, full_name, username, avatar_url)')
                        .eq('id', inserted.id)
                        .maybeSingle();

                    if (!data) return;

                    setComments((prev) => {
                        if (prev.some((comment) => comment.id === data.id)) return prev;
                        const optimisticIdx = prev.findIndex(
                            (comment) =>
                                comment.id.startsWith('opt-') &&
                                comment.user_id === data.user_id &&
                                comment.body === data.body
                        );
                        if (optimisticIdx !== -1) {
                            const next = [...prev];
                            next[optimisticIdx] = data as AuctionComment;
                            return next;
                        }
                        return [...prev, data as AuctionComment];
                    });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [auctionId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed || sending) return;

        if (!currentUserId) {
            router.push(`/login?redirectTo=/auctions/${auctionId}`);
            return;
        }

        setSending(true);
        setError('');
        setBody('');

        const optimisticId = `opt-${Date.now()}`;
        setComments((prev) => [
            ...prev,
            {
                id: optimisticId,
                auction_id: auctionId,
                user_id: currentUserId,
                body: trimmed,
                created_at: new Date().toISOString(),
                profile: {
                    id: currentUserId,
                    full_name: 'You',
                    username: 'you',
                    avatar_url: null,
                },
            },
        ]);

        const result = await sendAuctionCommentAction(auctionId, trimmed);
        if (!result.success) {
            setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
            setBody(trimmed);
            setError(result.error ?? 'Failed to post comment.');
        } else if (result.commentId) {
            setComments((prev) =>
                prev.map((comment) => (
                    comment.id === optimisticId ? { ...comment, id: result.commentId! } : comment
                ))
            );
        }

        setSending(false);
    };

    return (
        <div id="comments" className="border border-gray-200 bg-white mt-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-black">
                <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[11px] font-black text-white uppercase tracking-widest">Live Comments</p>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-4 py-4 bg-gray-50">
                {loading ? (
                    <div className="py-10 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="py-10 text-center">
                        <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No comments yet</p>
                        <p className="text-xs text-gray-400 mt-1">Be the first to ask a question or leave a comment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => {
                            const name = formatFirstNameLastInitial(comment.profile?.full_name ?? comment.profile?.username);
                            const isMine = comment.user_id === currentUserId;

                            return (
                                <div key={comment.id} className="flex items-start gap-3">
                                    {comment.profile?.id ? (
                                        <Link href={`/users/${comment.profile.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
                                            <Avatar
                                                src={comment.profile.avatar_url}
                                                name={name || 'User'}
                                                size="sm"
                                            />
                                        </Link>
                                    ) : (
                                        <Avatar
                                            src={comment.profile?.avatar_url}
                                            name={name || 'User'}
                                            size="sm"
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {comment.profile?.id ? (
                                                <Link href={`/users/${comment.profile.id}`} className="text-sm font-semibold text-black hover:underline underline-offset-2">
                                                    {name || 'User'}
                                                </Link>
                                            ) : (
                                                <p className="text-sm font-semibold text-black">{name || 'User'}</p>
                                            )}
                                            {isMine && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-black text-white">
                                                    You
                                                </span>
                                            )}
                                            <p className="text-[10px] text-gray-400">
                                                {comment.id.startsWith('opt-')
                                                    ? 'Sending...'
                                                    : new Date(comment.created_at).toLocaleString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                            </p>
                                        </div>
                                        <div className="mt-1 border border-gray-200 bg-white px-3 py-2.5">
                                            <p className="text-sm text-black whitespace-pre-wrap break-words">{comment.body}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="border-t border-gray-200 bg-white">
                {error && (
                    <div className="px-4 pt-3 text-xs font-semibold text-red-600">{error}</div>
                )}
                {!currentUserId && (
                    <div className="px-4 pt-3 text-xs text-gray-500">
                        <Link href={`/login?redirectTo=/auctions/${auctionId}`} className="font-semibold text-black underline underline-offset-2">
                            Log in
                        </Link>{' '}
                        to comment on this listing.
                    </div>
                )}
                <div className="p-4 flex gap-2">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="Ask a question, leave a comment, or discuss the listing..."
                        className="flex-1 resize-none border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black"
                    />
                    <button
                        type="submit"
                        disabled={!body.trim() || sending}
                        className="self-end inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Comment
                    </button>
                </div>
            </form>
        </div>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendAuctionCommentAction } from '@/app/actions/comments';
import { deleteAuctionCommentAction } from '@/app/actions/moderation';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { formatFirstNameLastInitial } from '@/lib/utils';
import { CornerDownRight, Loader2, MessageSquare, Send, Trash2, X } from 'lucide-react';

interface AuctionComment {
    id: string;
    auction_id: string;
    user_id: string;
    body: string;
    parent_id?: string | null;
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
    const { profile } = useAuth();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [comments, setComments] = useState<AuctionComment[]>([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [replyTo, setReplyTo] = useState<AuctionComment | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const canModerate = profile?.is_super_admin === true;

    useEffect(() => {
        const supabase = createClient();

        const fetchComments = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('auction_comments') as any)
                .select('id, auction_id, user_id, body, parent_id, created_at, profile:profiles!auction_comments_user_id_fkey(id, full_name, username, avatar_url)')
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
                        .select('id, auction_id, user_id, body, parent_id, created_at, profile:profiles!auction_comments_user_id_fkey(id, full_name, username, avatar_url)')
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

    // Top-level comments in time order, each followed by its replies in time order.
    const ordered = (() => {
        const ids = new Set(comments.map((c) => c.id));
        const top = comments.filter((c) => !c.parent_id || !ids.has(c.parent_id));
        const out: AuctionComment[] = [];
        for (const t of top) {
            out.push(t);
            for (const r of comments) if (r.parent_id === t.id) out.push(r);
        }
        return out;
    })();

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

        const replyingTo = replyTo;
        const threadParentId = replyingTo ? (replyingTo.parent_id ?? replyingTo.id) : null;

        setSending(true);
        setError('');
        setBody('');
        setReplyTo(null);

        const optimisticId = `opt-${Date.now()}`;
        setComments((prev) => [
            ...prev,
            {
                id: optimisticId,
                auction_id: auctionId,
                user_id: currentUserId,
                body: trimmed,
                parent_id: threadParentId,
                created_at: new Date().toISOString(),
                profile: {
                    id: currentUserId,
                    full_name: profile?.full_name ?? null,
                    username: profile?.username ?? '',
                    avatar_url: profile?.avatar_url ?? null,
                },
            },
        ]);

        const result = await sendAuctionCommentAction(auctionId, trimmed, threadParentId);
        if (!result.success) {
            setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
            setBody(trimmed);
            setReplyTo(replyingTo);
            setError(result.error ?? 'Failed to post comment.');
        } else if (result.commentId) {
            const commentId = result.commentId;
            // Replace the placeholder with the saved row so the name and photo come from the profile table.
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: saved } = await (supabase.from('auction_comments') as any)
                .select('id, auction_id, user_id, body, parent_id, created_at, profile:profiles!auction_comments_user_id_fkey(id, full_name, username, avatar_url)')
                .eq('id', commentId)
                .maybeSingle();
            setComments((prev) => {
                const placeholderStillThere = prev.some((comment) => comment.id === optimisticId);
                if (!placeholderStillThere) {
                    // The realtime INSERT already swapped the placeholder for the saved row.
                    // Leave the list alone so the comment does not vanish until a refresh;
                    // only append the row if it is somehow missing entirely.
                    if (prev.some((comment) => comment.id === commentId)) return prev;
                    return saved ? [...prev, saved as AuctionComment] : prev;
                }
                // Normal path: drop any duplicate realtime copy, then swap the placeholder.
                return prev
                    .filter((comment) => comment.id !== commentId)
                    .map((comment) => {
                        if (comment.id !== optimisticId) return comment;
                        return saved ? (saved as AuctionComment) : { ...comment, id: commentId };
                    });
            });
        }

        setSending(false);
    };

    const handleDelete = async (commentId: string) => {
        if (deletingId) return;

        setDeletingId(commentId);
        const result = await deleteAuctionCommentAction(commentId);
        setDeletingId(null);

        if (!result.success) {
            setError(result.error ?? 'Failed to delete comment.');
            return;
        }

        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    };

    return (
        <div id="comments" className="rounded-2xl overflow-hidden border border-gray-200 bg-white mt-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
                <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-[11px] font-black text-black uppercase tracking-widest">Live Comments</p>
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
                        {ordered.map((comment) => {
                            const name = formatFirstNameLastInitial(comment.profile?.full_name ?? comment.profile?.username);
                            const isMine = comment.user_id === currentUserId;
                            const isDeleting = deletingId === comment.id;
                            const isReply = !!comment.parent_id;

                            return (
                                <div key={comment.id} className={`flex items-start gap-3 ${isReply ? 'ml-8 sm:ml-11 pl-3 border-l-2 border-amber-200' : ''}`}>
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
                                            {comment.profile?.username && (
                                                <span className="text-xs text-gray-500">@{comment.profile.username}</span>
                                            )}
                                            {isMine && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-black text-white">
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
                                            {!comment.id.startsWith('opt-') && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!currentUserId) {
                                                            router.push(`/login?redirectTo=/auctions/${auctionId}`);
                                                            return;
                                                        }
                                                        setReplyTo(comment);
                                                        textareaRef.current?.focus();
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black"
                                                >
                                                    <CornerDownRight className="h-3 w-3" />
                                                    Reply
                                                </button>
                                            )}
                                            {canModerate && !comment.id.startsWith('opt-') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(comment.id)}
                                                    disabled={isDeleting}
                                                    className="inline-flex items-center gap-1 border border-red-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                    Delete
                                                </button>
                                            )}
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
                {replyTo && (
                    <div className="mx-4 mt-3 flex items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-black">
                        <span className="min-w-0 truncate">
                            Replying to <span className="font-semibold">{formatFirstNameLastInitial(replyTo.profile?.full_name ?? replyTo.profile?.username) || 'User'}</span>: {replyTo.body}
                        </span>
                        <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="shrink-0 text-gray-500 hover:text-black">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
                <div className="p-4 flex gap-2">
                    <textarea
                        ref={textareaRef}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder={replyTo ? 'Write your reply...' : 'Ask a question, leave a comment, or discuss the listing...'}
                        className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                    />
                    <button
                        type="submit"
                        disabled={!body.trim() || sending}
                        className="self-end inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-black text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {replyTo ? 'Reply' : 'Comment'}
                    </button>
                </div>
            </form>
        </div>
    );
}

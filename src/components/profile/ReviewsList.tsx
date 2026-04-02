'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Star, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { deleteUserReviewAction } from '@/app/actions/moderation';
import { timeAgo } from '@/lib/utils';

interface ReviewItem {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: {
        id: string;
        full_name: string | null;
        username: string | null;
    } | null;
}

export default function ReviewsList({
    reviews,
    emptyMessage,
}: {
    reviews: ReviewItem[];
    emptyMessage: string;
}) {
    const { profile } = useAuth();
    const [items, setItems] = useState(reviews);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const canModerate = profile?.is_super_admin === true;

    const handleDelete = async (reviewId: string) => {
        if (deletingId) return;

        setDeletingId(reviewId);
        const result = await deleteUserReviewAction(reviewId);
        setDeletingId(null);

        if (!result.success) {
            alert(result.error ?? 'Failed to delete review');
            return;
        }

        setItems((prev) => prev.filter((review) => review.id !== reviewId));
    };

    if (items.length === 0) {
        return <p className="text-sm text-gray-500">{emptyMessage}</p>;
    }

    return (
        <div className="space-y-4">
            {items.map((review) => {
                const reviewerName = review.reviewer?.full_name || review.reviewer?.username || 'Buyer';
                const reviewerHref = review.reviewer?.id ? `/users/${review.reviewer.id}` : null;
                const isDeleting = deletingId === review.id;

                return (
                    <div key={review.id} className="border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                {reviewerHref ? (
                                    <Link href={reviewerHref} className="text-sm font-bold text-black hover:underline underline-offset-2">
                                        {reviewerName}
                                    </Link>
                                ) : (
                                    <p className="text-sm font-bold text-black">{reviewerName}</p>
                                )}
                                <p className="text-xs text-gray-400">{timeAgo(review.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1 text-amber-500">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-current' : ''}`} />
                                    ))}
                                </div>
                                {canModerate && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(review.id)}
                                        disabled={isDeleting}
                                        className="inline-flex items-center gap-1 border border-red-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment?.trim() || 'No written comment provided.'}</p>
                    </div>
                );
            })}
        </div>
    );
}

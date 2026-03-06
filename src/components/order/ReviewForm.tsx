'use client';

import { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

interface ReviewFormProps {
    orderId: string;
    revieweeId: string;
    revieweeName: string;
    onSubmitted?: () => void;
}

export default function ReviewForm({ orderId, revieweeId, revieweeName, onSubmitted }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) { setError('Please select a rating.'); return; }
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    reviewee_id: revieweeId,
                    rating,
                    comment: comment.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? 'Failed to submit review.');
                return;
            }

            setSubmitted(true);
            onSubmitted?.();
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="border border-emerald-200 bg-emerald-50 p-6 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold text-emerald-800 text-sm">Review submitted!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Your rating for {revieweeName} has been recorded.</p>
                </div>
            </div>
        );
    }

    const display = hovered || rating;

    return (
        <div className="border border-gray-200 p-6 bg-white">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                Rate {revieweeName}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Stars */}
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setRating(n)}
                            onMouseEnter={() => setHovered(n)}
                            onMouseLeave={() => setHovered(0)}
                            className="p-0.5 focus:outline-none"
                            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                        >
                            <Star
                                className={`w-7 h-7 transition-colors ${
                                    n <= display
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-gray-100 text-gray-300'
                                }`}
                            />
                        </button>
                    ))}
                    {display > 0 && (
                        <span className="ml-2 text-xs font-bold text-gray-500">
                            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][display]}
                        </span>
                    )}
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
                        Comment <span className="text-gray-400 font-normal normal-case">(optional)</span>
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder={`How was your experience with ${revieweeName}?`}
                        className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors resize-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5 text-right">{comment.length}/500</p>
                </div>

                {error && (
                    <p className="text-[11px] text-red-500">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Submitting...' : 'Submit Review'}
                </button>
            </form>
        </div>
    );
}

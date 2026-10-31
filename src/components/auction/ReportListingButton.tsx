'use client';

import { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { submitSupportRequest } from '@/app/actions/support';
import { useAuth } from '@/hooks/useAuth';

const REPORT_REASONS = [
    'Scam or fraud',
    'Prohibited or unsafe item',
    'Wrong category or misleading description',
    'Spam or duplicate listing',
    'Something else',
] as const;

interface ReportListingButtonProps {
    auctionId: string;
    auctionTitle: string;
    className?: string;
}

export default function ReportListingButton({ auctionId, auctionTitle, className }: ReportListingButtonProps) {
    const { user, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
    const [details, setDetails] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);
        const message = [
            `Listing: ${auctionTitle}`,
            `URL: ${typeof window !== 'undefined' ? window.location.origin : ''}/auctions/${auctionId}`,
            `Reason: ${reason}`,
            '',
            details.trim() || '(no extra detail given)',
        ].join('\n');
        const result = await submitSupportRequest({
            name: profile?.full_name?.trim() || profile?.username?.trim() || name,
            email: user?.email ?? email,
            topic: 'Report a user or listing',
            message,
        });
        setSubmitting(false);
        if (!result.success) {
            setFeedback({ type: 'error', message: result.error ?? 'Could not send the report. Please try again.' });
            return;
        }
        setFeedback({ type: 'success', message: 'Report sent. Our team reviews every report.' });
        setDetails('');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => { setFeedback(null); setOpen(true); }}
                aria-label="Report listing"
                className={className}
            >
                <Flag className="h-4 w-4" strokeWidth={2} />
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
                    <div
                        className="w-full max-w-md bg-white border border-gray-200 p-5"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-label="Report listing"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-black">Report this listing</h3>
                                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{auctionTitle}</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-black">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {feedback?.type === 'success' ? (
                            <p className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">{feedback.message}</p>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Reason</span>
                                    <select
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black"
                                    >
                                        {REPORT_REASONS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Details (optional)</span>
                                    <textarea
                                        value={details}
                                        onChange={(e) => setDetails(e.target.value)}
                                        rows={3}
                                        maxLength={1500}
                                        placeholder="Anything our team should know."
                                        className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black"
                                    />
                                </label>
                                {!user && (
                                    <>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Your name</span>
                                            <input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Your email</span>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black"
                                            />
                                        </label>
                                    </>
                                )}
                                {feedback?.type === 'error' && (
                                    <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{feedback.message}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-gray-900 disabled:opacity-50"
                                >
                                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {submitting ? 'Sending...' : 'Send report'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

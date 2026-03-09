'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Ban, CheckCircle2, RefreshCcw } from 'lucide-react';
import { cancelOrderAction } from '@/app/actions/cancelOrder';
import { formatOrderStatusLabel, isCancelledOrderStatus } from '@/lib/orderStatus';

const BUYER_REASONS = [
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'mutual_agreement', label: 'Mutual agreement' },
    { value: 'duplicate_order', label: 'Duplicate order' },
    { value: 'other', label: 'Other' },
] as const;

const SELLER_REASONS = [
    { value: 'item_unavailable', label: 'Item no longer available' },
    { value: 'buyer_unreachable', label: 'Buyer unreachable' },
    { value: 'mutual_agreement', label: 'Mutual agreement' },
    { value: 'other', label: 'Other' },
] as const;

interface OrderCancellationPanelProps {
    orderId: string;
    status: string;
    isBuyer: boolean;
    canCancel: boolean;
    cancellationReason?: string | null;
}

export default function OrderCancellationPanel({
    orderId,
    status,
    isBuyer,
    canCancel,
    cancellationReason,
}: OrderCancellationPanelProps) {
    const router = useRouter();
    const [selectedReason, setSelectedReason] = useState<string>(isBuyer ? BUYER_REASONS[0].value : SELLER_REASONS[0].value);
    const [note, setNote] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const reasonOptions = useMemo(() => (isBuyer ? BUYER_REASONS : SELLER_REASONS), [isBuyer]);

    const handleCancel = () => {
        setFeedback(null);
        startTransition(async () => {
            const result = await cancelOrderAction({
                orderId,
                reason: selectedReason as Parameters<typeof cancelOrderAction>[0]['reason'],
                note,
            });

            if (!result.success) {
                setFeedback({ type: 'error', message: result.error || 'Failed to cancel the order.' });
                return;
            }

            const followUp = result.auctionAction === 'reopened'
                ? 'The listing was reopened for 24 hours.'
                : result.auctionAction === 'cancelled'
                    ? 'The listing was taken down.'
                    : 'The order was closed.';

            setFeedback({
                type: 'success',
                message: `Order cancelled successfully. ${followUp}`,
            });
            router.refresh();
        });
    };

    return (
        <div className="border border-gray-200 bg-white p-6">
            <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center ${canCancel ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isCancelledOrderStatus(status) ? <Ban className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Order cancellation
                    </h3>
                    {isCancelledOrderStatus(status) ? (
                        <>
                            <p className="mt-2 text-sm font-bold text-black">
                                {formatOrderStatusLabel(status)}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                {cancellationReason || 'This order has already been cancelled.'}
                            </p>
                        </>
                    ) : canCancel ? (
                        <>
                            <p className="mt-2 text-sm text-gray-600 leading-6">
                                Cancel is only allowed before fulfillment starts. Buyer cancellations reopen the listing for 24 hours. Seller cancellations take the listing down.
                            </p>

                            <div className="mt-4 grid gap-4">
                                <label className="block">
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Reason
                                    </span>
                                    <select
                                        value={selectedReason}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                                    >
                                        {reasonOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Note
                                    </span>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        rows={3}
                                        maxLength={240}
                                        placeholder="Add any detail the other party should know."
                                        className="w-full border border-gray-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                                    />
                                </label>
                            </div>

                            {feedback && (
                                <div className={`mt-4 flex items-start gap-2 border px-3 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                    {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                                    <span>{feedback.message}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isPending}
                                className="mt-4 inline-flex items-center gap-2 bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                            >
                                {isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                                {isPending ? 'Cancelling...' : 'Cancel order'}
                            </button>
                        </>
                    ) : (
                        <p className="mt-2 text-sm text-gray-500">
                            This order can no longer be cancelled from the app because fulfillment or completion has already started.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

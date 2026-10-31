'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setListingStatusAction, type ListingStatusChange } from '@/app/actions/updateListing';

interface OwnerStatusControlsProps {
    auctionId: string;
    status: string;
    isPermanent: boolean;
    bidCount: number;
}

export default function OwnerStatusControls({ auctionId, status, isPermanent, bidCount }: OwnerStatusControlsProps) {
    const router = useRouter();
    const [busy, setBusy] = useState<ListingStatusChange | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Same rules the server enforces: permanent listings with no bids only.
    if (!isPermanent || bidCount > 0) return null;
    const canPause = status === 'active';
    const canResume = status === 'draft' || status === 'ended';
    if (!canPause && !canResume) return null;

    const run = async (change: ListingStatusChange, confirmText?: string) => {
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(change);
        setError(null);
        const result = await setListingStatusAction(auctionId, change);
        setBusy(null);
        if (!result.success) {
            setError(result.error ?? 'Could not update this listing.');
            return;
        }
        router.refresh();
    };

    const btn = 'flex-1 rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50';

    return (
        <div className="mb-3 space-y-2">
            <div className="flex gap-2">
                {canPause && (
                    <button type="button" disabled={busy !== null} onClick={() => run('pause')} className={`${btn} border-gray-300 bg-white text-black hover:bg-gray-50`}>
                        {busy === 'pause' ? 'Pausing…' : 'Pause listing'}
                    </button>
                )}
                {canPause && (
                    <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => run('sold_elsewhere', 'Mark this listing as sold? It will be hidden from buyers. You can resume it later.')}
                        className={`${btn} border-gray-300 bg-white text-black hover:bg-gray-50`}
                    >
                        {busy === 'sold_elsewhere' ? 'Saving…' : 'Mark sold'}
                    </button>
                )}
                {canResume && (
                    <button type="button" disabled={busy !== null} onClick={() => run('resume')} className={`${btn} border-amber-400 bg-amber-400 text-black hover:bg-amber-500`}>
                        {busy === 'resume' ? 'Resuming…' : status === 'draft' ? 'Resume listing' : 'Relist'}
                    </button>
                )}
            </div>
            {status === 'draft' && (
                <p className="text-[11px] text-amber-700">Paused. Buyers can&apos;t see this listing in browse or search until you resume it.</p>
            )}
            {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
    );
}

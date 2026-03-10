'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
    title: string;
    text?: string;
    url: string;
    className?: string;
    label?: string;
    compact?: boolean;
}

export default function ShareButton({
    title,
    text,
    url,
    className,
    label = 'Share',
    compact = false,
}: ShareButtonProps) {
    const [statusLabel, setStatusLabel] = useState(label);
    const [pending, setPending] = useState(false);

    const resolveUrl = () => {
        if (/^https?:\/\//i.test(url)) return url;
        if (typeof window === 'undefined') return url;
        return new URL(url, window.location.origin).toString();
    };

    const flashLabel = (nextLabel: string) => {
        setStatusLabel(nextLabel);
        window.setTimeout(() => setStatusLabel(label), 1800);
    };

    const handleClick = async () => {
        if (pending) return;

        const shareUrl = resolveUrl();
        setPending(true);

        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share({ title, text, url: shareUrl });
                flashLabel('Shared');
                return;
            }

            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                flashLabel('Copied');
                return;
            }

            flashLabel('Link ready');
        } catch {
            flashLabel('Copy failed');
        } finally {
            setPending(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className={cn(
                'inline-flex items-center justify-center gap-2 border transition-colors disabled:opacity-50',
                compact
                    ? 'h-9 w-9 border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black'
                    : 'px-4 py-2 bg-white text-black border-gray-200 hover:border-black',
                className
            )}
            aria-label={label}
        >
            <Share2 className="h-4 w-4" strokeWidth={1.8} />
            {!compact && (
                <span className="text-xs font-black uppercase tracking-widest">
                    {statusLabel}
                </span>
            )}
        </button>
    );
}

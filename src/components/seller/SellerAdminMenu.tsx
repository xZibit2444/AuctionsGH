'use client';

import { useEffect, useRef, useState } from 'react';
import { EllipsisVertical, Ban, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { banUserAction } from '@/app/actions/adminUsers';

interface SellerAdminMenuProps {
    sellerId: string;
    sellerName: string;
}

export default function SellerAdminMenu({ sellerId, sellerName }: SellerAdminMenuProps) {
    const { user, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    if (!profile?.is_super_admin || user?.id === sellerId) {
        return null;
    }

    const handleBan = async () => {
        const reason = window.prompt(`Ban ${sellerName}? Optional reason:`) ?? '';
        setPending(true);
        setError(null);
        setMessage(null);

        const result = await banUserAction(sellerId, reason);
        setPending(false);
        setOpen(false);

        if (!result.success) {
            setError(result.error ?? 'Failed to ban seller.');
            return;
        }

        setMessage(`${sellerName} has been permanently banned.`);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center border border-gray-200 text-gray-500 transition-colors hover:border-black hover:text-black"
                aria-label="Seller moderation settings"
                title="Seller moderation settings"
            >
                <EllipsisVertical className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 border border-gray-200 bg-white shadow-lg">
                    <button
                        onClick={() => void handleBan()}
                        disabled={pending}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                        <Ban className="h-4 w-4" />
                        {pending ? 'Banning seller...' : 'Permanent ban seller'}
                    </button>
                </div>
            )}

            {(message || error) && (
                <div className={`mt-3 flex items-start gap-2 border px-3 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error ?? message}</span>
                </div>
            )}
        </div>
    );
}

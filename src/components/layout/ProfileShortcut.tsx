'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface ProfileShortcutProps {
    className?: string;
}

const MENU_ITEMS = [
    { href: '/profile', label: 'Profile' },
    { href: '/orders', label: 'My Orders' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
];

// Signed-in user's photo. Opens a small menu of account pages. Navigation only.
export default function ProfileShortcut({ className }: ProfileShortcutProps) {
    const { user, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!user) return null;
    const name = profile?.full_name || profile?.username || 'Profile';

    return (
        <div ref={rootRef} className={cn('relative shrink-0', className)}>
            <button
                ref={buttonRef}
                type="button"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="block rounded-full hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
                <Avatar src={profile?.avatar_url} name={name} size="sm" className="h-9 w-9 rounded-full ring-1 ring-gray-200" />
            </button>
            {open && (
                <div role="menu" aria-label="Account" className="absolute right-0 top-full mt-2 w-48 border border-gray-200 bg-white shadow-lg z-50 py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-bold text-black truncate">{name}</p>
                        {profile?.username && <p className="text-[11px] text-gray-500 truncate">@{profile.username}</p>}
                    </div>
                    {MENU_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className="block px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface ProfileShortcutProps {
    className?: string;
}

// Signed-in user's photo, links to their profile. Public profile fields only.
export default function ProfileShortcut({ className }: ProfileShortcutProps) {
    const { user, profile } = useAuth();
    if (!user) return null;
    const name = profile?.full_name || profile?.username || 'Profile';

    return (
        <Link href="/profile" aria-label="Your profile" title="Your profile" className={cn('block shrink-0 hover:opacity-80 transition-opacity', className)}>
            <Avatar src={profile?.avatar_url} name={name} size="sm" className="h-9 w-9 rounded-full ring-1 ring-gray-200" />
        </Link>
    );
}

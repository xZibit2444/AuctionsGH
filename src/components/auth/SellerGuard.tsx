'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function SellerGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const blocked = !loading && (!user || profile?.is_banned);

    useEffect(() => {
        if (blocked) {
            router.push(user ? '/' : '/login');
        }
    }, [blocked, user, router]);

    if (loading || !user || profile?.is_banned) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !profile?.is_admin)) {
            router.push('/');
        }
    }, [user, profile, loading, router]);

    if (loading || !user || !profile?.is_admin) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    return <>{children}</>;
}

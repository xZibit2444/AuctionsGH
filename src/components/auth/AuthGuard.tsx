'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            fallback ?? (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-200 border-t-black" />
                </div>
            )
        );
    }

    if (!user) return null;

    return <>{children}</>;
}

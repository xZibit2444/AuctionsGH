'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="w-16 h-16 bg-red-50 border border-red-100 flex items-center justify-center rounded-full mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-black tracking-tight mb-2">Something went wrong</h2>
            <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
                {error.message || "An unexpected error occurred while loading this page. Please try again or return home."}
            </p>

            <div className="flex items-center gap-3 w-full max-w-xs">
                <button
                    onClick={() => reset()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors"
                >
                    <RotateCcw className="h-4 w-4" /> Try Again
                </button>
                <Link
                    href="/"
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 text-black text-sm font-bold hover:border-black transition-colors"
                >
                    <Home className="h-4 w-4" /> Home
                </Link>
            </div>
        </div>
    );
}

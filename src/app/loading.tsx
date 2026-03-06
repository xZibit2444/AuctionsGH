'use client';

import { useEffect } from 'react';

const STUCK_LOADING_TIMEOUT_MS = 5_000;
const REFRESH_COOLDOWN_MS = 30_000;

export default function Loading() {
    useEffect(() => {
        const currentUrl = window.location.pathname + window.location.search + window.location.hash;
        const storageKey = `loading-refresh:${currentUrl}`;

        const timer = window.setTimeout(() => {
            try {
                const lastRefreshAt = Number(sessionStorage.getItem(storageKey) ?? '0');
                const now = Date.now();

                if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
                    return;
                }

                sessionStorage.setItem(storageKey, String(now));
                window.location.reload();
            } catch {
                window.location.reload();
            }
        }, STUCK_LOADING_TIMEOUT_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                <p className="text-sm font-black text-black uppercase tracking-widest animate-pulse">
                    Loading
                </p>
            </div>
        </div>
    );
}

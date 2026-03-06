'use client';

import { useEffect, useState } from 'react';

interface CheckoutTimerProps {
    endsAt: string; // The time the auction ended
}

// 30 minutes in milliseconds
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export default function CheckoutTimer({ endsAt }: CheckoutTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const auctionEnd = new Date(endsAt).getTime();
            const deadline = auctionEnd + THIRTY_MINUTES_MS;
            const now = new Date().getTime();
            const difference = deadline - now;

            if (difference <= 0) {
                setExpired(true);
                setTimeLeft({ minutes: 0, seconds: 0 });
            } else {
                setTimeLeft({
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            }
        };

        // Initial calculation
        calculateTimeLeft();

        // Update every second
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [endsAt]);

    if (!timeLeft) {
        return <div className="animate-pulse bg-gray-100 h-10 w-32" />;
    }

    if (expired) {
        return (
            <div className="bg-red-50 text-red-600 px-4 py-3 border border-red-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="font-bold text-sm">Confirmation window expired</div>
            </div>
        );
    }

    // Format with leading zeros
    const mm = timeLeft.minutes.toString().padStart(2, '0');
    const ss = timeLeft.seconds.toString().padStart(2, '0');

    // Warning state if under 5 minutes
    const isWarning = timeLeft.minutes < 5;

    return (
        <div className={`flex flex-col items-center justify-center p-4 border-2 ${isWarning ? 'border-red-500 bg-red-50 text-red-600' : 'border-black bg-black text-white'}`}>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                Time Remaining to Confirm
            </div>
            <div className="text-3xl font-mono font-bold tracking-tight">
                {mm}:{ss}
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

function getTimeLeft(endsAt: string): TimeLeft {
    const total = Math.max(0, new Date(endsAt).getTime() - Date.now());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / 1000 / 60 / 60) % 24);
    const days = Math.floor(total / 1000 / 60 / 60 / 24);
    return { days, hours, minutes, seconds, total };
}

interface CountdownTimerProps {
    endsAt: string;
    /** Compact single-line mode for use inside cards */
    compact?: boolean;
}

export default function CountdownTimer({ endsAt, compact = false }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(endsAt));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(getTimeLeft(endsAt));
        }, 1000);
        return () => clearInterval(interval);
    }, [endsAt]);

    const isExpired = timeLeft.total <= 0;
    const isUrgent = !isExpired && timeLeft.total < 5 * 60 * 1000; // < 5 minutes

    if (isExpired) {
        return compact ? (
            <span className="text-xs font-medium text-gray-400">Auction ended</span>
        ) : (
            <p className="text-center text-sm text-gray-400 font-medium py-2">Auction has ended</p>
        );
    }

    if (compact) {
        const display = timeLeft.days > 0
            ? `${timeLeft.days}d ${timeLeft.hours}h left`
            : timeLeft.hours > 0
                ? `${timeLeft.hours}h ${String(timeLeft.minutes).padStart(2, '0')}m left`
                : `${timeLeft.minutes}:${String(timeLeft.seconds).padStart(2, '0')} left`;

        return (
            <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
            >
                <span>🕐</span>
                {display}
            </span>
        );
    }

    // Full countdown display
    const units = [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Mins', value: timeLeft.minutes },
        { label: 'Secs', value: timeLeft.seconds },
    ];

    return (
        <div
            className={`flex items-center justify-center gap-2 sm:gap-4 ${isUrgent ? 'animate-pulse' : ''
                }`}
        >
            {units.map(({ label, value }) => (
                <div key={label} className="text-center">
                    <div
                        className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${isUrgent
                                ? 'text-red-500'
                                : 'text-gray-900 dark:text-white'
                            }`}
                    >
                        {String(value).padStart(2, '0')}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide mt-1">
                        {label}
                    </p>
                </div>
            ))}
        </div>
    );
}

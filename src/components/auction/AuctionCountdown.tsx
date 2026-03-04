'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';

interface AuctionCountdownProps {
    endTime: string | Date;
    compact?: boolean;
    className?: string;
}

export default function AuctionCountdown({
    endTime,
    compact = false,
    className,
}: AuctionCountdownProps) {
    const { days, hours, minutes, seconds, isExpired, total } = useCountdown(endTime);

    if (isExpired) {
        return (
            <span className={cn('text-red-500 font-semibold text-sm', className)}>
                Ended
            </span>
        );
    }

    const isUrgent = total < 5 * 60 * 1000; // < 5 minutes

    if (compact) {
        return (
            <div
                className={cn(
                    'text-right',
                    isUrgent && 'animate-pulse',
                    className
                )}
            >
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Ends in</p>
                <p
                    className={cn(
                        'text-sm font-bold tabular-nums',
                        isUrgent
                            ? 'text-red-500'
                            : 'text-gray-900 dark:text-white'
                    )}
                >
                    {days > 0 && `${days}d `}
                    {hours.toString().padStart(2, '0')}:
                    {minutes.toString().padStart(2, '0')}:
                    {seconds.toString().padStart(2, '0')}
                </p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex gap-2',
                isUrgent && 'animate-pulse',
                className
            )}
        >
            {[
                { value: days, label: 'Days' },
                { value: hours, label: 'Hrs' },
                { value: minutes, label: 'Min' },
                { value: seconds, label: 'Sec' },
            ].map(({ value, label }) => (
                <div
                    key={label}
                    className={cn(
                        'flex flex-col items-center px-3 py-2 rounded-xl min-w-[3.5rem]',
                        isUrgent
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : 'bg-gray-100 dark:bg-gray-800'
                    )}
                >
                    <span
                        className={cn(
                            'text-xl font-bold tabular-nums',
                            isUrgent
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-white'
                        )}
                    >
                        {value.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}

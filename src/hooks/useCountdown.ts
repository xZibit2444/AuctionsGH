'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { getTimeRemaining } from '@/lib/utils';

export function useCountdown(endTime: string | Date) {
    const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(endTime));

    const update = useCallback(() => {
        startTransition(() => setTimeLeft(getTimeRemaining(endTime)));
    }, [endTime]);

    useEffect(() => {
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [update]);

    return timeLeft;
}

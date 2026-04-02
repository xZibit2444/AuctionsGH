'use client';

import { useEffect, useState } from 'react';

function getIsUserAvailable() {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return false;
    }

    return document.visibilityState === 'visible' && document.hasFocus();
}

export function useUserAvailability() {
    const [isAvailable, setIsAvailable] = useState(getIsUserAvailable);

    useEffect(() => {
        const updateAvailability = () => {
            setIsAvailable(getIsUserAvailable());
        };

        updateAvailability();

        document.addEventListener('visibilitychange', updateAvailability);
        window.addEventListener('focus', updateAvailability);
        window.addEventListener('blur', updateAvailability);
        window.addEventListener('pageshow', updateAvailability);
        window.addEventListener('pagehide', updateAvailability);

        return () => {
            document.removeEventListener('visibilitychange', updateAvailability);
            window.removeEventListener('focus', updateAvailability);
            window.removeEventListener('blur', updateAvailability);
            window.removeEventListener('pageshow', updateAvailability);
            window.removeEventListener('pagehide', updateAvailability);
        };
    }, []);

    return isAvailable;
}

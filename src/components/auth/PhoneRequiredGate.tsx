'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { isPhoneGateExempt } from '@/lib/phone';

/**
 * Every signed-in account must have a phone number, whichever way it signed up
 * (email, Google, GitHub). Accounts without one are sent to /complete-profile.
 * This only collects the number; it does not verify ownership.
 * Fails open: if the number cannot be read, nobody is redirected.
 */
export default function PhoneRequiredGate() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    // Remember only a positive result (this user has a number); anything else is re-checked on every navigation.
    const hasPhoneFor = useRef<string | null>(null);

    useEffect(() => {
        if (loading || !user || isPhoneGateExempt(pathname)) return;
        if (hasPhoneFor.current === user.id) return;
        let cancelled = false;
        (async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (createClient() as any).rpc('get_profile_phone', { profile_id: user.id });
                if (cancelled || error) return;
                if (typeof data === 'string' && data.trim() !== '') {
                    hasPhoneFor.current = user.id;
                } else {
                    router.replace(`/complete-profile?next=${encodeURIComponent(pathname)}`);
                }
            } catch { /* fail open */ }
        })();
        return () => { cancelled = true; };
    }, [loading, user, pathname, router]);

    return null;
}

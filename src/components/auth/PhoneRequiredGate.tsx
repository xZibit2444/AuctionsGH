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
    const checkedFor = useRef<string | null>(null);

    useEffect(() => {
        if (loading || !user || isPhoneGateExempt(pathname)) return;
        if (checkedFor.current === user.id) return;
        checkedFor.current = user.id;
        let cancelled = false;
        (async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (createClient() as any).rpc('get_profile_phone', { profile_id: user.id });
                if (cancelled || error) return;
                if (typeof data !== 'string' || data.trim() === '') {
                    checkedFor.current = null;
                    router.replace(`/complete-profile?next=${encodeURIComponent(pathname)}`);
                }
            } catch { /* fail open */ }
        })();
        return () => { cancelled = true; };
    }, [loading, user, pathname, router]);

    return null;
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { isProfileSetupGateExempt } from '@/lib/profileSetup';

/**
 * New accounts are guided through a one-time profile setup step (photo, cover,
 * username) after signup. Accounts created before this shipped are backfilled
 * and never redirected. Runs after the phone gate: an account without a phone
 * number goes to /complete-profile first. Fails open like the phone gate.
 */
export default function ProfileSetupGate() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    // Remember only a positive result (setup done); anything else is re-checked on every navigation.
    const setupDoneFor = useRef<string | null>(null);

    useEffect(() => {
        if (loading || !user || isProfileSetupGateExempt(pathname)) return;
        if (setupDoneFor.current === user.id) return;
        let cancelled = false;
        (async () => {
            try {
                const supabase = createClient();
                // The phone gate owns accounts without a number; setup comes after it.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: phone, error: phoneError } = await (supabase as any)
                    .rpc('get_profile_phone', { profile_id: user.id });
                if (cancelled || phoneError) return;
                if (typeof phone !== 'string' || phone.trim() === '') return;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase.from('profiles') as any)
                    .select('profile_setup_done')
                    .eq('id', user.id)
                    .maybeSingle();
                if (cancelled || error || !data) return;
                if (data.profile_setup_done === true) {
                    setupDoneFor.current = user.id;
                } else {
                    router.replace(`/setup-profile?next=${encodeURIComponent(pathname)}`);
                }
            } catch { /* fail open */ }
        })();
        return () => { cancelled = true; };
    }, [loading, user, pathname, router]);

    return null;
}

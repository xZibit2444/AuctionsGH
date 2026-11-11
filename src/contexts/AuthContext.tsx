'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';

interface AuthContextValue {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    signOutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => {},
    signOutAll: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Single stable client for the lifetime of the app
    const supabase = useMemo(() => createClient(), []);

    const fetchProfile = useCallback(
        async (userId: string, client: SupabaseClient) => {
            try {
                let { data, error } = await client
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                // After the phone-privacy migration, select('*') fails on the
                // revoked phone_number column. Fall back to explicit columns
                // and fetch the owner's own phone via the gated function.
                if (error && /phone_number|permission denied/i.test(error.message ?? '')) {
                    const retry = await client
                        .from('profiles')
                        .select('id, username, full_name, avatar_url, location, show_past_buys, show_past_sales, is_verified, is_admin, is_super_admin, is_banned, banned_at, banned_reason, banned_by, notification_preferences, whatsapp_enabled, created_at, updated_at')
                        .eq('id', userId)
                        .single();
                    data = retry.data as typeof data;
                    error = retry.error;
                    if (data) {
                        const { data: phone } = await (client as any).rpc('get_profile_phone', { profile_id: userId });
                        (data as { phone_number?: string | null }).phone_number = (phone as string | null) ?? null;
                    }
                }
                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                }
                if (data?.is_banned) {
                    await client.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    return;
                }
                setProfile(data || null);
            } catch {
                setProfile(null);
            }
        },
        []
    );

    useEffect(() => {
        let mounted = true;

        // Safety-net: if auth hasn't resolved in 4s, stop blocking the UI
        const timeout = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 4000);

        // onAuthStateChange fires immediately with INITIAL_SESSION (reads from
        // localStorage — no network round-trip), so we don't need a separate
        // getUser() call that would block the UI.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return;
                const u = session?.user ?? null;
                setUser(u);
                if (mounted) setLoading(false);
                if (u) {
                    void fetchProfile(u.id, supabase);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    }, [supabase]);

    const signOutAll = useCallback(async () => {
        await supabase.auth.signOut({ scope: 'global' });
        setUser(null);
        setProfile(null);
    }, [supabase]);

    const value = useMemo(
        () => ({ user, profile, loading, signOut, signOutAll }),
        [user, profile, loading, signOut, signOutAll]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}

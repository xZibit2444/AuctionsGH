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
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => {},
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
                const { data, error } = await client
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
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

        // onAuthStateChange fires immediately with INITIAL_SESSION (reads from
        // localStorage — no network round-trip), so we don't need a separate
        // getUser() call that would block the UI.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return;
                const u = session?.user ?? null;
                setUser(u);
                if (u) await fetchProfile(u.id, supabase);
                else setProfile(null);
                if (mounted) setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    }, [supabase]);

    const value = useMemo(
        () => ({ user, profile, loading, signOut }),
        [user, profile, loading, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}

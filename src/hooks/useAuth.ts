'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Stabilize the supabase reference
    const supabase = useMemo(() => createClient(), []);

    // Stabilize the fetch function and avoid outer scoped supabase dependency
    const fetchProfile = useCallback(
        async (userId: string, currentSupabase: SupabaseClient) => {
            try {
                const { data, error } = await currentSupabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                }
                setProfile(data || null);
            } catch (err) {
                console.error('Unexpected error fetching profile:', err);
                setProfile(null);
            }
        },
        []
    );

    useEffect(() => {
        let mounted = true;

        const getSession = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;

                if (!mounted) return;

                setUser(user);
                if (user) {
                    await fetchProfile(user.id, supabase);
                } else {
                    setProfile(null);
                }
            } catch (e) {
                console.error('Auth error:', e);
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Suppress loading flash if we already have a synchronous session
        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                await fetchProfile(currentUser.id, supabase);
            } else {
                setProfile(null);
            }
            if (mounted) {
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return { user, profile, loading, signOut };
}

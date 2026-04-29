'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/types/profile';
import { isMissingBanColumnError } from '@/lib/supabase/banGuards';

const admin = createAdminClient();

export async function banUserAction(
    userId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: callerProfile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle() as {
            data: Pick<Profile, 'is_super_admin'> | null;
            error: unknown;
        };

    if (!callerProfile?.is_super_admin) {
        return { success: false, error: 'Forbidden' };
    }

    if (userId === user.id) {
        return { success: false, error: 'You cannot ban your own account' };
    }

    const { data: targetProfile, error: targetError } = await admin
        .from('profiles')
        .select('id, is_super_admin, is_banned')
        .eq('id', userId)
        .maybeSingle() as {
            data: Pick<Profile, 'id' | 'is_super_admin' | 'is_banned'> | null;
            error: unknown;
        };

    if (targetError || !targetProfile) {
        if (isMissingBanColumnError(targetError)) {
            return { success: false, error: 'Ban columns are missing in the database. Run migration 041_user_bans.sql first.' };
        }
        return { success: false, error: 'User not found' };
    }

    if (targetProfile.is_super_admin) {
        return { success: false, error: 'You cannot ban another super admin' };
    }

    if (targetProfile.is_banned) {
        return { success: false, error: 'This user is already banned' };
    }

    const updates: Partial<Profile> = {
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason?.trim() || null,
        banned_by: user.id,
        updated_at: new Date().toISOString(),
    };

    const { error } = await ((admin
        .from('profiles')) as unknown as {
            update: (values: Partial<Profile>) => {
                eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }>;
            };
        })
        .update(updates)
        .eq('id', userId);

    if (error) {
        if (isMissingBanColumnError(error)) {
            return { success: false, error: 'Ban columns are missing in the database. Run migration 041_user_bans.sql first.' };
        }
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function unbanUserAction(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: callerProfile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle() as {
            data: Pick<Profile, 'is_super_admin'> | null;
            error: unknown;
        };

    if (!callerProfile?.is_super_admin) {
        return { success: false, error: 'Forbidden' };
    }

    const { data: targetProfile, error: targetError } = await admin
        .from('profiles')
        .select('id, is_banned')
        .eq('id', userId)
        .maybeSingle() as {
            data: Pick<Profile, 'id' | 'is_banned'> | null;
            error: unknown;
        };

    if (targetError || !targetProfile) {
        return { success: false, error: 'User not found' };
    }

    if (!targetProfile.is_banned) {
        return { success: false, error: 'This user is not banned' };
    }

    const updates: Partial<Profile> = {
        is_banned: false,
        banned_at: null,
        banned_reason: null,
        banned_by: null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await ((admin
        .from('profiles')) as unknown as {
            update: (values: Partial<Profile>) => {
                eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }>;
            };
        })
        .update(updates)
        .eq('id', userId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

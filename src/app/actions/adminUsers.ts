'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
        .maybeSingle();

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
        .maybeSingle();

    if (targetError || !targetProfile) {
        return { success: false, error: 'User not found' };
    }

    if (targetProfile.is_super_admin) {
        return { success: false, error: 'You cannot ban another super admin' };
    }

    if (targetProfile.is_banned) {
        return { success: false, error: 'This user is already banned' };
    }

    const { error } = await admin
        .from('profiles')
        .update({
            is_banned: true,
            banned_at: new Date().toISOString(),
            banned_reason: reason?.trim() || null,
            banned_by: user.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    if (error) return { success: false, error: error.message };

    return { success: true };
}

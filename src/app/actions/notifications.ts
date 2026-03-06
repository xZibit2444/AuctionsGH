'use server';

import { createClient } from '@/lib/supabase/server';

export async function markAllReadAction(): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) return { error: error.message };
    return { success: true };
}

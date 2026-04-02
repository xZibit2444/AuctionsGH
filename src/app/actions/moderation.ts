'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { ok: false as const, error: 'Not authenticated' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };

    if (!profile?.is_super_admin) {
        return { ok: false as const, error: 'Forbidden' };
    }

    return { ok: true as const };
}

export async function deleteAuctionCommentAction(commentId: string) {
    if (!commentId) return { success: false, error: 'Missing comment id' };

    const auth = await requireSuperAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = createAdminClient();
    const { error } = await admin
        .from('auction_comments')
        .delete()
        .eq('id', commentId);

    if (error) return { success: false, error: error.message };

    return { success: true };
}

export async function deleteUserReviewAction(reviewId: string) {
    if (!reviewId) return { success: false, error: 'Missing review id' };

    const auth = await requireSuperAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    const admin = createAdminClient();
    const { error } = await admin
        .from('user_reviews')
        .delete()
        .eq('id', reviewId);

    if (error) return { success: false, error: error.message };

    return { success: true };
}

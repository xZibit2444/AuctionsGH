'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };
    return profile?.is_super_admin ? user : null;
}

export async function adminCreateNewsItem(payload: {
    title: string;
    content: string;
    is_published: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const trimTitle = payload.title.trim();
    const trimContent = payload.content.trim();
    if (!trimTitle) return { success: false, error: 'Title is required' };
    if (!trimContent) return { success: false, error: 'Content is required' };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('news_updates')
        .insert({ title: trimTitle, content: trimContent, is_published: payload.is_published })
        .select('id')
        .single() as { data: { id: string } | null; error: unknown };

    if (error) return { success: false, error: (error as any).message ?? 'DB error' };
    return { success: true, id: data!.id };
}

export async function adminUpdateNewsItem(
    id: string,
    payload: { title?: string; content?: string; is_published?: boolean }
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const updates: Record<string, unknown> = {};
    if (payload.title !== undefined) updates.title = payload.title.trim();
    if (payload.content !== undefined) updates.content = payload.content.trim();
    if (payload.is_published !== undefined) updates.is_published = payload.is_published;

    const admin = createAdminClient();
    const { error } = await admin
        .from('news_updates')
        .update(updates)
        .eq('id', id);

    if (error) return { success: false, error: (error as any).message ?? 'DB error' };
    return { success: true };
}

export async function adminDeleteNewsItem(
    id: string
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const admin = createAdminClient();
    const { error } = await admin
        .from('news_updates')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: (error as any).message ?? 'DB error' };
    return { success: true };
}

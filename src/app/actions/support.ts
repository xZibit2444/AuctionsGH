'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient as _createAdminClient } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAdminClient = () => _createAdminClient() as any;

export const SUPPORT_TOPICS = [
    'Order or delivery',
    'Listing or auction',
    'Account or login',
    'Report a user or listing',
    'Becoming a seller',
    'Something else',
] as const;

export interface SupportInput {
    name: string;
    email: string;
    topic: string;
    message: string;
    website?: string; // honeypot, must stay empty
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitSupportRequest(
    input: SupportInput
): Promise<{ success: boolean; error?: string }> {
    // Bots fill the hidden field. Pretend success without storing anything.
    if (input.website && input.website.trim() !== '') return { success: true };

    const name = (input.name ?? '').trim();
    const email = (input.email ?? '').trim().toLowerCase();
    const topic = (input.topic ?? '').trim();
    const message = (input.message ?? '').trim();

    if (name.length < 2 || name.length > 80) return { success: false, error: 'Please enter your name.' };
    if (!EMAIL_RE.test(email) || email.length > 120) return { success: false, error: 'Please enter a valid email so we can reply.' };
    if (!(SUPPORT_TOPICS as readonly string[]).includes(topic)) return { success: false, error: 'Please choose a topic.' };
    if (message.length < 10) return { success: false, error: 'Please describe your issue in a few more words.' };
    if (message.length > 2000) return { success: false, error: 'Message is too long (2000 characters max).' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
        .from('support_requests')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .gte('created_at', since);
    if ((count ?? 0) >= 5) {
        return { success: false, error: 'Too many requests from this email. Please try again in an hour.' };
    }

    const { error } = await admin.from('support_requests').insert({
        user_id: user?.id ?? null,
        name,
        email,
        topic,
        message,
    });
    if (error) return { success: false, error: 'Could not send your request. Please try again.' };
    return { success: true };
}

async function requireSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null };
    return profile?.is_super_admin ? user : null;
}

export async function adminSetSupportStatus(
    id: string,
    status: 'new' | 'in_progress' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };
    if (!['new', 'in_progress', 'resolved'].includes(status)) return { success: false, error: 'Invalid status' };
    const admin = createAdminClient();
    const { error } = await admin.from('support_requests').update({ status }).eq('id', id);
    if (error) return { success: false, error: 'Could not update the request' };
    return { success: true };
}

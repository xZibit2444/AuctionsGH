import { createClient } from '@supabase/supabase-js';

import { PHONE_REQUIRED_MESSAGE } from './phone';

export { PHONE_REQUIRED_MESSAGE };

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Server-side phone check (service role, so it does not depend on column grants).
 * true = number on file, false = none, null = could not be read.
 */
export async function hasPhoneNumber(userId: string): Promise<boolean | null> {
    const admin = adminClient();
    if (!admin) return null;
    const { data, error } = await admin.from('profiles').select('phone_number').eq('id', userId).maybeSingle();
    if (error) return null;
    const phone = (data as { phone_number?: string | null } | null)?.phone_number;
    return typeof phone === 'string' && phone.trim() !== '';
}

/**
 * For write paths: allowed only when a number is confirmed on file.
 * Fails closed (an unreadable profile blocks the write; the same database would fail it anyway).
 */
export async function userMayWrite(userId: string): Promise<boolean> {
    return (await hasPhoneNumber(userId)) === true;
}

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

/**
 * Cron endpoint to close expired auctions.
 * Secured by CRON_SECRET header check (timing-safe).
 * Meant to be called every 1 minute by Vercel Cron or similar.
 */
export async function GET(request: Request) {
    const auth = isAuthorizedCronRequest(request);
    if (!auth.ok) {
        if (auth.status === 500) {
            console.error('[cron] %s', auth.error);
        }
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.rpc('close_expired_auctions');

    if (error) {
        console.error('[cron]', error.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}

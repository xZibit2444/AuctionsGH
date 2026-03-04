import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Cron endpoint to close expired auctions.
 * Secured by CRON_SECRET header check (timing-safe).
 * Meant to be called every 1 minute by Vercel Cron or similar.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[cron] CRON_SECRET is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') ?? '';
    const expected = `Bearer ${cronSecret}`;

    // Timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(authHeader, expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.rpc('close_expired_auctions');

    if (error) {
        console.error('[cron]', error.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}

/**
 * Constant-time string comparison to prevent timing attacks on secrets.
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        // Still do the comparison to keep timing consistent,
        // but we know the result is false.
        const dummy = new TextEncoder().encode(a);
        const dummyB = new TextEncoder().encode(a); // compare with self
        crypto.subtle
            // fire-and-forget to keep timing consistent
            ?.digest('SHA-256', dummy)
            .catch(() => { });
        void dummyB;
        return false;
    }

    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(b);

    let result = 0;
    for (let i = 0; i < bufA.length; i++) {
        result |= bufA[i] ^ bufB[i];
    }
    return result === 0;
}

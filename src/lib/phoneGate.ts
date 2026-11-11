import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPhoneGateExempt } from '@/lib/phone';
import { hasPhoneNumber } from '@/lib/phoneRequirement';

const COOKIE = 'agh_phone_ok';

function sign(userId: string): string | null {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) return null;
    return createHmac('sha256', secret).update(`phone:${userId}`).digest('hex');
}

function cookieValid(value: string | undefined, userId: string): boolean {
    const expected = sign(userId);
    if (!value || !expected) return false;
    const [uid, sig] = value.split('.');
    if (uid !== userId || !sig || sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * Server-side page gate: signed-in users without a phone number are redirected to
 * /complete-profile before any page renders. A signed cookie caches "has a number"
 * so the profile is read once, not on every navigation. Fails open on read errors
 * (the client gate and the write-path checks still apply).
 */
export async function applyPhoneGate(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    if (request.method !== 'GET') return response;
    const pathname = request.nextUrl.pathname;
    if (isPhoneGateExempt(pathname)) return response;
    if (request.headers.get('next-router-prefetch') || request.headers.get('purpose') === 'prefetch') return response;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon || !process.env.SUPABASE_SERVICE_ROLE_KEY) return response;
    if (!request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))) return response;

    try {
        const supabase = createServerClient(url, anon, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } });
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return response;
        if (cookieValid(request.cookies.get(COOKIE)?.value, userId)) return response;

        const has = await hasPhoneNumber(userId);
        if (has === null) return response;
        if (has) {
            const sig = sign(userId);
            if (sig) response.cookies.set(COOKIE, `${userId}.${sig}`, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
            return response;
        }
        const target = request.nextUrl.clone();
        target.pathname = '/complete-profile';
        target.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
        const redirect = NextResponse.redirect(target);
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
        return redirect;
    } catch {
        return response;
    }
}

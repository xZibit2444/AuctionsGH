import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    // Handle Supabase error redirects (e.g. expired OTP links)
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');
    if (errorCode) {
        const msg = errorCode === 'otp_expired'
            ? 'expired'
            : encodeURIComponent(errorDescription ?? 'auth');
        return NextResponse.redirect(`${origin}/login?error=${msg}`);
    }

    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const rawNext = searchParams.get('next') ?? '/';

    // Prevent open redirect — only allow relative paths
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

    const supabase = await createClient();

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Flag brand-new OAuth accounts so the client can record a GA4 sign_up event.
            // Guarded twice: a 2-minute account-age window plus a durable user_metadata flag,
            // so a repeat login cannot be counted as a second sign-up.
            const { data: { user } } = await supabase.auth.getUser();
            const createdAt = user?.created_at ? Date.parse(user.created_at) : NaN;
            const isNewUser =
                Number.isFinite(createdAt) &&
                Date.now() - createdAt < 2 * 60 * 1000 &&
                !user?.user_metadata?.signup_recorded;
            if (isNewUser) {
                try {
                    await supabase.auth.updateUser({ data: { signup_recorded: true } });
                } catch {
                    // Non-fatal: worst case the event is skipped or double-counted once.
                }
                const provider = (user?.app_metadata?.provider as string | undefined) || 'oauth';
                const sep = next.includes('?') ? '&' : '?';
                return NextResponse.redirect(`${origin}${next}${sep}signup=oauth&provider=${encodeURIComponent(provider)}`);
            }
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
        });

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth`);
}

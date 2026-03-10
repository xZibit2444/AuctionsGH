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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams, hash, origin } = new URL(request.url);

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
    const rawNext = searchParams.get('next') ?? '/';

    // Prevent open redirect — only allow relative paths
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth`);
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const pathname = request.nextUrl.pathname;

    // Only protected routes need an auth/session lookup.
    // Doing this work on every navigation can leave normal page transitions
    // waiting on Supabase for routes that are otherwise completely public.
    const protectedPaths = ['/dashboard', '/auctions/create', '/seller-apply', '/admin'];
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

    if (!isProtected) {
        return supabaseResponse;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Allow builds and non-auth routes to proceed even when Supabase env vars
    // are not available in the current execution context.
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Read session purely from cookie — no network call.
    // Using getUser() here would trigger a Supabase Auth network round-trip on
    // every navigation which is the primary cause of slow page loads.
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

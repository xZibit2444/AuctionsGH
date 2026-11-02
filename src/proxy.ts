import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { listingDetailId, isListingUuid } from '@/lib/listingRoute';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
    // Resolve missing listing pages before React starts streaming a 200 response.
    // Reads use the same session/RLS as the page; no elevated database access.
    const id = listingDetailId(request.nextUrl.pathname);
    if (id !== null) {
        let missing = !isListingUuid(id);
        if (!missing && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            try {
                const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
                    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
                });
                const { data, error } = await supabase.from('auctions').select('id').eq('id', id).maybeSingle();
                // A database failure is not proof that the item does not exist.
                missing = !error && !data;
            } catch { /* Let the page handle transient service errors. */ }
        }
        if (missing) return new NextResponse('<!doctype html><html lang="en"><head><title>Listing not found | AuctionsGH</title><meta name="robots" content="noindex,follow"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;max-width:640px;margin:15vh auto;padding:24px"><h1>Listing not found</h1><p>This listing does not exist or is no longer available.</p><a href="/listings">Browse listings on AuctionsGH</a></body></html>', {
            status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'no-store' },
        });
    }
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Only run on page navigations and API routes.
         * Skip _next/*, static assets, and all file extensions.
         */
        '/((?!_next/|_vercel/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
    ],
};

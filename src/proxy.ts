import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Only run on page navigations and API routes.
         * Skip _next/*, static assets, and all file extensions.
         */
        '/((?!_next/|_vercel/|favicon\.ico|.*\.[a-zA-Z0-9]+$).*)',
    ],
};

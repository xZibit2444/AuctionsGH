import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribe } from '@/lib/newsletterToken';

export const dynamic = 'force-dynamic';

function page(title: string, message: string, form?: { u: string; t: string }, status = 200) {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f4f4;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif"><div style="max-width:440px;margin:80px auto;background:#fff;border:1px solid #e5e5e5;padding:32px;text-align:center">
<h1 style="font-size:20px;margin:0 0 12px;color:#000">${esc(title)}</h1><p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 20px">${esc(message)}</p>
${form ? `<form method="POST" action="/unsubscribe?u=${encodeURIComponent(form.u)}&amp;t=${encodeURIComponent(form.t)}"><button type="submit" style="background:#000;color:#fff;border:0;padding:12px 28px;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">Unsubscribe</button></form>` : ''}
<p style="font-size:12px;color:#888;margin:20px 0 0"><a href="https://auctionsgh.com" style="color:#888">auctionsgh.com</a></p></div></body></html>`;
    return new NextResponse(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

// Opening the link only shows a confirm button, so mail scanners that prefetch links cannot unsubscribe anyone.
export async function GET(request: NextRequest) {
    const u = request.nextUrl.searchParams.get('u') ?? '';
    const t = request.nextUrl.searchParams.get('t') ?? '';
    if (!u || !t || !verifyUnsubscribe(u, t)) {
        return page('Link not valid', 'This unsubscribe link is not valid. You can turn off promotional emails any time in Settings > Notifications.', undefined, 400);
    }
    return page('Unsubscribe from listing emails', 'Stop receiving promotional listing emails from AuctionsGH. Order and account emails will continue.', { u, t });
}

// Handles both the confirm button and the one-click unsubscribe request sent by mail apps (RFC 8058).
export async function POST(request: NextRequest) {
    const u = request.nextUrl.searchParams.get('u') ?? '';
    const t = request.nextUrl.searchParams.get('t') ?? '';
    if (!u || !t || !verifyUnsubscribe(u, t)) {
        return page('Link not valid', 'This unsubscribe link is not valid. You can turn off promotional emails any time in Settings > Notifications.', undefined, 400);
    }
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const { data: profile, error } = await db.from('profiles').select('notification_preferences').eq('id', u).maybeSingle();
    if (error || !profile) {
        return page('Something went wrong', 'We could not update your preference. You can turn off promotional emails in Settings > Notifications.', undefined, 500);
    }
    const prefs = { ...(profile.notification_preferences ?? {}), promotions: false };
    const { error: updateError } = await db.from('profiles').update({ notification_preferences: prefs }).eq('id', u);
    if (updateError) {
        return page('Something went wrong', 'We could not update your preference. You can turn off promotional emails in Settings > Notifications.', undefined, 500);
    }
    return page('You are unsubscribed', 'You will not get promotional listing emails from AuctionsGH any more. Order and account emails will continue.');
}

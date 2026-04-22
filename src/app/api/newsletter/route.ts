import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import NewsletterEmail from '@/emails/NewsletterEmail';

const SENDER_EMAIL =
    process.env.RESEND_FROM_EMAIL || 'AuctionsGH <noreply@auctionsgh.com>';

function getResend() {
    const key = process.env.RESEND_API_KEY;
    return key ? new Resend(key) : null;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Auth check
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, is_super_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse optional body — allow caller to pass specific news IDs or date label
    const body = await request.json().catch(() => ({}));
    const newsIds: string[] | undefined = body.newsIds;
    const dateLabel: string | undefined = body.dateLabel;

    // Fetch news items to include
    let newsQuery = supabase
        .from('news_updates')
        .select('id, title, content, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (newsIds && newsIds.length > 0) {
        newsQuery = newsQuery.in('id', newsIds);
    }

    const { data: newsItems, error: newsError } = await newsQuery;

    if (newsError) {
        return NextResponse.json(
            { error: 'Failed to fetch news', details: newsError.message },
            { status: 500 }
        );
    }

    if (!newsItems || newsItems.length === 0) {
        return NextResponse.json(
            { error: 'No published news items found' },
            { status: 404 }
        );
    }

    // Fetch all confirmed user emails via service-role client
    const { createClient: createServiceClient } = await import(
        '@/lib/supabase/server'
    );
    const serviceSupabase = await createServiceClient();

    // Use profiles table to gather emails — join with auth.users not exposed,
    // so we rely on email stored in profiles or fall back to auth admin API.
    const { data: profiles, error: profilesError } = await serviceSupabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null);

    if (profilesError) {
        return NextResponse.json(
            { error: 'Failed to fetch user emails', details: profilesError.message },
            { status: 500 }
        );
    }

    const emails = (profiles ?? [])
        .map((p) => p.email as string)
        .filter((e) => typeof e === 'string' && e.includes('@'));

    if (emails.length === 0) {
        return NextResponse.json(
            { error: 'No subscriber emails found' },
            { status: 404 }
        );
    }

    const resend = getResend();
    if (!resend) {
        return NextResponse.json(
            { error: 'Email service not configured' },
            { status: 503 }
        );
    }

    const displayDate =
        dateLabel ??
        new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

    const subject = `Auction Listings — ${displayDate}`;

    // Resend batch allows up to 100 emails per call — chunk if needed
    const BATCH_SIZE = 100;
    const batches: string[][] = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        batches.push(emails.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const batch of batches) {
        const batchPayload = batch.map((to) => ({
            from: SENDER_EMAIL,
            to,
            subject,
            react: NewsletterEmail({ items: newsItems, date: displayDate }),
        }));

        const { data, error } = await resend.batch.send(batchPayload);

        if (error) {
            errors.push(error.message ?? String(error));
        } else {
            totalSent += data?.data?.length ?? batch.length;
        }
    }

    if (errors.length > 0 && totalSent === 0) {
        return NextResponse.json(
            { error: 'Newsletter sending failed', details: errors },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        sent: totalSent,
        total_subscribers: emails.length,
        items_included: newsItems.length,
        errors: errors.length > 0 ? errors : undefined,
    });
}

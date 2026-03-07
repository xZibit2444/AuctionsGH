import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DIDIT_BASE = 'https://apx.didit.me';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.DIDIT_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Verification service not configured' }, { status: 500 });
    }

    const { sessionId } = await params;

    const res = await fetch(
        `${DIDIT_BASE}/identity/v2/session/${sessionId}/decision/`,
        {
            headers: { Authorization: `Bearer ${apiKey}` },
            // Don't cache – we need fresh status each poll
            cache: 'no-store',
        }
    );

    if (!res.ok) {
        console.error('[Didit] status check failed:', res.status);
        return NextResponse.json({ error: 'Failed to check verification status' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
}

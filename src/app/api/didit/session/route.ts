import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DIDIT_BASE = 'https://apx.didit.me';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.DIDIT_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Verification service not configured' }, { status: 500 });
    }

    const res = await fetch(`${DIDIT_BASE}/identity/v2/business/session/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            features: 'OCR,LIVENESS',
            vendor_data: user.id,
        }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        const detail = body?.detail ?? body?.message ?? body?.error ?? JSON.stringify(body);
        console.error('[Didit] session creation failed:', res.status, detail);
        return NextResponse.json(
            { error: `Verification service error: ${detail}` },
            { status: 502 }
        );
    }

    return NextResponse.json({
        session_id: body.session_id,
        url: body.url,
    });
}

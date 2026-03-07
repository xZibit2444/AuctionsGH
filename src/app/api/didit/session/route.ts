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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const res = await fetch(`${DIDIT_BASE}/identity/v2/business/session/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // Collect document + liveness for full KYC
            features: 'DOCUMENT_CAPTURE | LIVENESS_CAPTURE',
            callback: `${appUrl}/api/didit/callback`,
            vendor_data: user.id,
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error('[Didit] session creation failed:', res.status, errorText);
        return NextResponse.json({ error: 'Failed to start identity verification' }, { status: 502 });
    }

    const session = await res.json();
    return NextResponse.json({
        session_id: session.session_id,
        url: session.url,
    });
}

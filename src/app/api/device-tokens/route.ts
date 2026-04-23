import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

async function getUser(request: NextRequest) {
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

// POST /api/device-tokens — register a push token
export async function POST(request: NextRequest) {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { token?: string; platform?: string };
    const { token, platform = 'unknown' } = body;

    if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
        .from('device_push_tokens')
        .upsert(
            { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
            { onConflict: 'token' }
        );

    if (error) {
        console.error('Failed to register push token:', error);
        return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// DELETE /api/device-tokens — deregister a push token on sign-out
export async function DELETE(request: NextRequest) {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { token?: string };
    const { token } = body;

    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
        .from('device_push_tokens')
        .delete()
        .eq('token', token)
        .eq('user_id', user.id);

    return NextResponse.json({ success: true });
}

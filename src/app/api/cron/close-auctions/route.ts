import { NextResponse } from 'next/server';
import { finalizeAuction } from '@/lib/auctionFinalization';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export async function GET(request: Request) {
    const auth = isAuthorizedCronRequest(request);
    if (!auth.ok) {
        if (auth.status === 500) {
            console.error('[cron] %s', auth.error);
        }
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data: auctions, error } = await supabase
        .from('auctions')
        .select('id')
        .eq('status', 'active')
        .lte('ends_at', nowIso);

    if (error) {
        console.error('[cron]', error.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    const results = await Promise.all(
        (auctions ?? []).map(async (auction) => ({
            id: auction.id,
            result: await finalizeAuction(auction.id),
        }))
    );

    const failed = results.filter((item) => !item.result.success);
    if (failed.length > 0) {
        console.error('[cron] finalize failures', failed);
    }

    return NextResponse.json({
        ok: failed.length === 0,
        processed: results.length,
        failed: failed.length,
        timestamp: new Date().toISOString(),
    });
}

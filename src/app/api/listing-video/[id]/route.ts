import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AUCTION_VIDEOS_BUCKET } from '@/lib/constants';

// Serves a listing's video. The storage bucket is private, so this route checks the
// listing and mints a short-lived signed URL. Videos on draft listings are only
// served to their seller.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
        return new NextResponse('Not found', { status: 404 });
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: video } = await (admin.from('listing_videos') as any)
        .select('storage_path, seller_id, auctions!inner(status)')
        .eq('auction_id', id)
        .maybeSingle();

    if (!video) {
        return new NextResponse('Not found', { status: 404 });
    }

    const status = video.auctions?.status as string | undefined;
    if (status === 'draft') {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== video.seller_id) {
            return new NextResponse('Not found', { status: 404 });
        }
    }

    const { data: signed, error } = await admin.storage
        .from(AUCTION_VIDEOS_BUCKET)
        .createSignedUrl(video.storage_path as string, 120);

    if (error || !signed?.signedUrl) {
        return new NextResponse('Not found', { status: 404 });
    }

    return NextResponse.redirect(signed.signedUrl, {
        status: 302,
        headers: { 'Cache-Control': 'no-store' },
    });
}

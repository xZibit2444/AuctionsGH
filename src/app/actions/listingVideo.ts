'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AUCTION_VIDEOS_BUCKET, MAX_VIDEO_SIZE } from '@/lib/constants';

const supabaseAdmin = createAdminClient();

type VideoValidation =
    | { ok: true; contentType: 'video/mp4' | 'video/webm' }
    | { ok: false; error: string };

const MP4_CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta']);

// Walk MP4 box tree and collect the sample entry types from every stsd box.
function collectMp4SampleEntries(buf: Buffer, start: number, end: number, out: string[]) {
    let pos = start;
    while (pos + 8 <= end) {
        let size = buf.readUInt32BE(pos);
        const type = buf.toString('latin1', pos + 4, pos + 8);
        let header = 8;
        if (size === 1) {
            if (pos + 16 > end) break;
            size = Number(buf.readBigUInt64BE(pos + 8));
            header = 16;
        } else if (size === 0) {
            size = end - pos;
        }
        if (size < header || pos + size > end) break;
        if (type === 'stsd') {
            // 4 bytes version/flags + 4 bytes entry count, then sample entry boxes.
            let epos = pos + header + 8;
            const eend = pos + size;
            while (epos + 8 <= eend) {
                let esize = buf.readUInt32BE(epos);
                const etype = buf.toString('latin1', epos + 4, epos + 8);
                if (esize === 0) esize = eend - epos;
                if (esize < 8 || epos + esize > eend) break;
                out.push(etype);
                epos += esize;
            }
        } else if (MP4_CONTAINER_BOXES.has(type)) {
            collectMp4SampleEntries(buf, pos + header, pos + size, out);
        }
        pos += size;
    }
}

// Accept only videos that actually play in current browsers:
// - MP4 with H.264 (avc1/avc3), AV1 (av01) or VP9 (vp09) tracks
// - WebM with VP8/VP9/AV1 (or H.264) tracks
// iPhone HEVC (hvc1/hev1) and QuickTime .mov files are rejected with a clear reason.
function validateVideoBytes(buf: Buffer): VideoValidation {
    if (buf.length < 12) {
        return { ok: false, error: 'That file is too small to be a video. Choose an MP4 or WebM video.' };
    }

    // MP4/MOV: 'ftyp' at offset 4
    if (buf.toString('latin1', 4, 8) === 'ftyp') {
        const majorBrand = buf.toString('latin1', 8, 12);
        if (majorBrand === 'qt  ') {
            return { ok: false, error: 'QuickTime (.mov) videos are not supported. Please convert the video to MP4 and try again.' };
        }
        const entries: string[] = [];
        collectMp4SampleEntries(buf, 0, buf.length, entries);
        if (entries.some((t) => t === 'hvc1' || t === 'hev1')) {
            return { ok: false, error: 'This video uses iPhone HEVC format, which many browsers cannot play. Convert it to MP4 (H.264) and try again - on iPhone, set Settings > Camera > Formats > Most Compatible and record it again.' };
        }
        if (entries.some((t) => t === 'avc1' || t === 'avc3' || t === 'av01' || t === 'vp09')) {
            return { ok: true, contentType: 'video/mp4' };
        }
        return { ok: false, error: 'This video uses a format browsers cannot play. Please convert it to MP4 (H.264) and try again.' };
    }

    // WebM/Matroska: EBML magic 1A 45 DF A3
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
        const head = buf.toString('latin1', 0, Math.min(buf.length, 1024 * 1024));
        if (
            head.includes('V_VP8') ||
            head.includes('V_VP9') ||
            head.includes('V_AV1') ||
            head.includes('V_MPEG4/ISO/AVC')
        ) {
            return { ok: true, contentType: 'video/webm' };
        }
        return { ok: false, error: 'This WebM video uses a codec browsers cannot play. Please convert it to MP4 (H.264) and try again.' };
    }

    return { ok: false, error: "That file is not really an MP4 or WebM video. Renaming a file does not convert it - export it as MP4 (H.264) and try again." };
}

async function removeStoredFile(path: string) {
    const { error } = await supabaseAdmin.storage.from(AUCTION_VIDEOS_BUCKET).remove([path]);
    if (error) console.error('Failed to remove stored listing video:', error.message);
}

export async function finalizeListingVideo(
    auctionId: string,
    storagePath: string,
    durationSeconds?: number
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // The path must live in this seller's folder for this listing (blocks traversal and
    // pointing the action at somebody else's file).
    const pathOk = typeof storagePath === 'string'
        && storagePath.startsWith(`${user.id}/${auctionId}/`)
        && !storagePath.includes('..')
        && /^[a-zA-Z0-9/_\-.]+$/.test(storagePath);
    if (!pathOk) return { success: false, error: 'Invalid video file reference.' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: auction } = await (supabaseAdmin.from('auctions') as any)
        .select('id, seller_id')
        .eq('id', auctionId)
        .maybeSingle();
    if (!auction) return { success: false, error: 'Listing not found' };
    if (auction.seller_id !== user.id) return { success: false, error: 'Not allowed to add a video to this listing' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabaseAdmin.from('listing_videos') as any)
        .select('id')
        .eq('auction_id', auctionId)
        .maybeSingle();
    if (existing) {
        await removeStoredFile(storagePath);
        return { success: false, error: 'This listing already has a video. Remove it first to add a new one.' };
    }

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from(AUCTION_VIDEOS_BUCKET)
        .download(storagePath);
    if (downloadError || !blob) {
        return { success: false, error: 'The uploaded video could not be read. Please try again.' };
    }

    if (blob.size > MAX_VIDEO_SIZE) {
        await removeStoredFile(storagePath);
        return { success: false, error: 'The video is over 20MB. Please use a shorter or smaller video.' };
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const validation = validateVideoBytes(buf);
    if (!validation.ok) {
        await removeStoredFile(storagePath);
        return { success: false, error: validation.error };
    }

    const duration = typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.round(durationSeconds * 10) / 10
        : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabaseAdmin.from('listing_videos') as any).insert({
        auction_id: auctionId,
        seller_id: user.id,
        storage_path: storagePath,
        content_type: validation.contentType,
        size_bytes: blob.size,
        duration_seconds: duration,
    });

    if (insertError) {
        await removeStoredFile(storagePath);
        // Unique index backstop: two concurrent uploads for the same listing.
        if (insertError.code === '23505') {
            return { success: false, error: 'This listing already has a video. Remove it first to add a new one.' };
        }
        return { success: false, error: 'Could not save the video. Please try again.' };
    }

    return { success: true };
}

export async function removeListingVideo(
    auctionId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: video } = await (supabaseAdmin.from('listing_videos') as any)
        .select('id, storage_path, seller_id')
        .eq('auction_id', auctionId)
        .maybeSingle();
    if (!video) return { success: true };
    if (video.seller_id !== user.id) return { success: false, error: 'Not allowed to remove this video' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabaseAdmin.from('listing_videos') as any)
        .delete()
        .eq('id', video.id);
    if (deleteError) return { success: false, error: 'Could not remove the video. Please try again.' };

    await removeStoredFile(video.storage_path);
    return { success: true };
}

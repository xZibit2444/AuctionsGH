'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AUCTION_VIDEOS_BUCKET } from '@/lib/constants';

interface VideoUploadResult {
    path: string;
}

// Uploads straight into the private auction-videos bucket. The file is not viewable by
// anyone until the finalizeListingVideo server action validates it and records it.
export function useVideoUpload() {
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
    const supabase = createClient();

    const uploadVideo = async (
        file: File,
        userId: string,
        auctionId: string
    ): Promise<VideoUploadResult | null> => {
        setUploadingVideo(true);
        setVideoUploadError(null);

        // Extension from MIME type, not the user-supplied filename.
        const fileExt = file.type === 'video/webm' ? 'webm' : 'mp4';
        const filePath = `${userId}/${auctionId}/${Date.now()}-video.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from(AUCTION_VIDEOS_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type,
                });

            if (uploadError) {
                setVideoUploadError(uploadError.message);
                return null;
            }

            // No public URL: the bucket is private on purpose.
            return { path: filePath };
        } catch (err) {
            setVideoUploadError('An unexpected error occurred during video upload.');
            console.error(err);
            return null;
        } finally {
            setUploadingVideo(false);
        }
    };

    return { uploadVideo, uploadingVideo, videoUploadError };
}

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { validateImageFile } from '@/lib/validators';
import { AUCTION_IMAGES_BUCKET } from '@/lib/constants';

interface UploadResult {
    url: string;
    path: string;
}

export function useImageUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const uploadImage = async (
        file: File,
        userId: string,
        auctionId: string
    ): Promise<UploadResult | null> => {
        const validationError = validateImageFile(file);
        if (validationError) {
            setError(validationError);
            return null;
        }

        setUploading(true);
        setError(null);

        // Derive extension from MIME type, not user-supplied filename (prevents path traversal)
        const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
        };
        const fileExt = mimeToExt[file.type] ?? 'jpg';
        const filePath = `${userId}/${auctionId}/${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from(AUCTION_IMAGES_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                setError(uploadError.message);
                return null;
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from(AUCTION_IMAGES_BUCKET).getPublicUrl(filePath);

            return { url: publicUrl, path: filePath };
        } catch (err) {
            setError('An unexpected error occurred during image upload.');
            console.error(err);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const deleteImage = async (path: string) => {
        const { error: deleteError } = await supabase.storage
            .from(AUCTION_IMAGES_BUCKET)
            .remove([path]);

        if (deleteError) {
            setError(deleteError.message);
        }
    };

    return { uploadImage, deleteImage, uploading, error };
}

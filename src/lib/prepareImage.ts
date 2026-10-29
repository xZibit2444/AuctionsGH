const MAX_SIDE = 2048;
const COMPRESS_OVER = 1.5 * 1024 * 1024;

function isHeic(file: File): boolean {
    return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Shrinks big photos and converts HEIC/HEIF to JPEG when the browser can decode them.
 * Returns the original file if anything fails, so existing behaviour is never worse.
 */
export async function prepareImage(file: File): Promise<File> {
    const heic = isHeic(file);
    const isCommon = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!heic && !(isCommon && file.size > COMPRESS_OVER)) return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
        if (!blob || (!heic && blob.size >= file.size)) return file;
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

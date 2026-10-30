const MAX_SIDE = 2048;
const COMPRESS_OVER = 1.5 * 1024 * 1024;

// Pinned HEIC decoder (heic2any 0.0.4, MIT). Loaded only when a HEIC file is picked and the
// browser cannot decode it itself (everything except Safari). The SRI hash makes the browser
// refuse the file if the CDN ever serves different bytes.
const HEIC_DECODER_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
const HEIC_DECODER_SRI = 'sha384-OTofQ0MEeiSgh62havBcemCIK0gqj809wX6UA0uPISNMRnR6NZyCdGzX3SbLrgwL';

type Heic2Any = (opts: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
let decoderLoad: Promise<Heic2Any | null> | null = null;

function isHeic(file: File): boolean {
    return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function loadHeicDecoder(): Promise<Heic2Any | null> {
    if (typeof document === 'undefined') return Promise.resolve(null);
    const w = window as unknown as { heic2any?: Heic2Any };
    if (w.heic2any) return Promise.resolve(w.heic2any);
    if (!decoderLoad) {
        decoderLoad = new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = HEIC_DECODER_URL;
            s.integrity = HEIC_DECODER_SRI;
            s.crossOrigin = 'anonymous';
            s.async = true;
            s.onload = () => resolve(w.heic2any ?? null);
            s.onerror = () => {
                decoderLoad = null;
                resolve(null);
            };
            document.head.appendChild(s);
        });
    }
    return decoderLoad;
}

async function browserCanDecode(file: File): Promise<boolean> {
    try {
        const bitmap = await createImageBitmap(file);
        bitmap.close?.();
        return true;
    } catch {
        return false;
    }
}

async function heicToJpeg(file: File): Promise<File | null> {
    try {
        const decode = await loadHeicDecoder();
        if (!decode) return null;
        const out = await decode({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        const blob = Array.isArray(out) ? out[0] : out;
        if (!blob) return null;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
        return null;
    }
}

/**
 * Shrinks big photos and converts HEIC/HEIF to JPEG. Browsers that can decode HEIC (Safari) do it
 * natively; others use the lazily loaded decoder above. Returns the original file if anything
 * fails, so existing behaviour is never worse.
 */
export async function prepareImage(file: File): Promise<File> {
    let source = file;
    if (isHeic(file) && !(await browserCanDecode(file))) {
        const converted = await heicToJpeg(file);
        if (!converted) return file;
        source = converted;
    }
    const heic = isHeic(source);
    const isCommon = ['image/jpeg', 'image/png', 'image/webp'].includes(source.type);
    if (!heic && !(isCommon && source.size > COMPRESS_OVER)) return source;
    try {
        const bitmap = await createImageBitmap(source);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return source;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
        if (!blob || (!heic && blob.size >= source.size)) return source;
        const name = source.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
    } catch {
        return source;
    }
}

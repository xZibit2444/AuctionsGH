'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PROFILE_IMAGES_BUCKET } from '@/lib/constants';
import { validateImageFile } from '@/lib/validators';
import { COVER_PRESETS, type CoverPreset } from '@/lib/cover';

const PRESET_SWATCH: Record<CoverPreset, string> = {
    yellow: 'bg-amber-400',
    black: 'bg-neutral-900',
    split: 'cover-split',
};

interface CoverEditorProps {
    userId: string;
    value: string | null;
    onChange: (value: string | null) => void;
}

export default function CoverEditor({ userId, value, onChange }: CoverEditorProps) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const save = async (next: string | null) => {
        setBusy(true);
        setError('');
        try {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (supabase.from('profiles') as any)
                .update({ cover_url: next })
                .eq('id', userId);
            if (updateError) throw updateError;
            onChange(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save cover.');
        } finally {
            setBusy(false);
        }
    };

    const upload = async (file?: File | null) => {
        if (!file) return;
        const invalid = validateImageFile(file);
        if (invalid) {
            setError(invalid);
            return;
        }
        setBusy(true);
        setError('');
        try {
            const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type] ?? 'jpg';
            const path = `${userId}/cover-${Date.now()}.${ext}`;
            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from(PROFILE_IMAGES_BUCKET)
                .upload(path, file, { cacheControl: '3600', upsert: true });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
            await save(data.publicUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed.');
            setBusy(false);
        } finally {
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-2 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-black/85 sm:right-4 sm:top-4"
            >
                <Camera className="h-4 w-4" />
                Edit cover
            </button>
            {open && (
                <div className="absolute right-3 top-14 z-20 w-[min(20rem,calc(100%-1.5rem))] rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-xl sm:right-4">
                    <p className="text-sm font-black text-black">Edit cover</p>
                    <p className="mt-1 text-xs text-gray-500">Wide image works best (3:1). JPG, PNG or WebP, up to 5 MB.</p>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileRef.current?.click()}
                        className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 px-3 py-4 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
                    >
                        {busy ? 'Saving…' : 'Upload a cover image'}
                    </button>
                    <div className="mt-3 flex gap-2">
                        {COVER_PRESETS.map((preset) => {
                            const key = `preset:${preset}`;
                            const selected = value === key || (preset === 'split' && !value);
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    disabled={busy}
                                    aria-label={`${preset} cover`}
                                    onClick={() => void save(key)}
                                    className={`h-12 flex-1 rounded-lg border-2 ${PRESET_SWATCH[preset]} ${selected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'}`}
                                />
                            );
                        })}
                    </div>
                    {value && /^https?:/.test(value) && (
                        <button type="button" disabled={busy} onClick={() => void save(null)} className="mt-3 text-xs font-bold text-gray-500 underline underline-offset-2">
                            Remove cover
                        </button>
                    )}
                    {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
                    <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-xl bg-amber-400 px-3 py-2.5 text-sm font-extrabold text-black hover:bg-amber-500">
                        Done
                    </button>
                </div>
            )}
        </>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Check, ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PROFILE_IMAGES_BUCKET } from '@/lib/constants';
import { validateImageFile } from '@/lib/validators';
import { parseCover, type CoverPreset } from '@/lib/cover';
import { safeNextPath } from '@/lib/phone';
import { validateSetupUsername } from '@/lib/profileSetup';
import Avatar from '@/components/ui/Avatar';

// Swatch order tracks the approved setup mockup: yellow first, black second, split last.
const SETUP_COVER_PRESETS: CoverPreset[] = ['yellow', 'black', 'split'];

const PRESET_SWATCH: Record<CoverPreset, string> = {
    yellow: 'bg-amber-400',
    black: 'bg-neutral-900',
    split: 'cover-split',
};

const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

export default function SetupProfileForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const next = safeNextPath(searchParams.get('next'));

    const [profileLoaded, setProfileLoaded] = useState(false);
    const [username, setUsername] = useState('');
    const [originalUsername, setOriginalUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [coverValue, setCoverValue] = useState<string | null>(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [coverBusy, setCoverBusy] = useState(false);
    const [saving, setSaving] = useState<'save' | 'skip' | null>(null);
    const [error, setError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (createClient().from('profiles') as any)
                .select('username, full_name, avatar_url, cover_url')
                .eq('id', user.id)
                .maybeSingle();
            if (cancelled) return;
            const currentUsername = typeof data?.username === 'string' ? data.username : '';
            setUsername(currentUsername);
            setOriginalUsername(currentUsername);
            setDisplayName(typeof data?.full_name === 'string' && data.full_name ? data.full_name : currentUsername);
            setAvatarUrl(typeof data?.avatar_url === 'string' ? data.avatar_url : null);
            setCoverValue(typeof data?.cover_url === 'string' ? data.cover_url : null);
            setProfileLoaded(true);
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (!user) return null;

    const uploadImage = async (file: File | null | undefined, kind: 'avatar' | 'cover') => {
        if (!file) return;
        const invalid = validateImageFile(file);
        if (invalid) {
            setError(invalid);
            return;
        }
        const setBusy = kind === 'avatar' ? setAvatarBusy : setCoverBusy;
        setBusy(true);
        setError('');
        try {
            const ext = MIME_TO_EXT[file.type] ?? 'jpg';
            const path = kind === 'avatar'
                ? `${user.id}/${Date.now()}.${ext}`
                : `${user.id}/cover-${Date.now()}.${ext}`;
            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from(PROFILE_IMAGES_BUCKET)
                .upload(path, file, { cacheControl: '3600', upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
            // Persist immediately so "Skip for now" never loses an uploaded image.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (supabase.from('profiles') as any)
                .update(kind === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl })
                .eq('id', user.id);
            if (updateError) throw updateError;
            if (kind === 'avatar') setAvatarUrl(publicUrl);
            else setCoverValue(publicUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
        } finally {
            setBusy(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
            if (coverInputRef.current) coverInputRef.current.value = '';
        }
    };

    const pickPreset = async (preset: CoverPreset) => {
        const nextValue = `preset:${preset}`;
        if (coverValue === nextValue || (!coverValue && preset === 'split')) return;
        setCoverBusy(true);
        setError('');
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (createClient().from('profiles') as any)
                .update({ cover_url: nextValue })
                .eq('id', user.id);
            if (updateError) throw updateError;
            setCoverValue(nextValue);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save cover.');
        } finally {
            setCoverBusy(false);
        }
    };

    const finish = async (mode: 'save' | 'skip') => {
        if (saving) return;
        setError('');
        setUsernameError('');

        const normalizedUsername = username.trim().toLowerCase();
        const usernameChanged = mode === 'save' && normalizedUsername !== originalUsername;
        if (mode === 'save') {
            const validationError = validateSetupUsername(username);
            if (validationError) {
                setUsernameError(validationError);
                return;
            }
        }

        setSaving(mode);
        try {
            const supabase = createClient();
            if (usernameChanged) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: usernameUpdateError } = await (supabase.from('profiles') as any)
                    .update({ username: normalizedUsername })
                    .eq('id', user.id);
                if (usernameUpdateError) {
                    const msg = (usernameUpdateError as { message?: string }).message ?? '';
                    if ((usernameUpdateError as { code?: string }).code === '23505' || /username/i.test(msg)) {
                        setUsernameError('That username is already taken.');
                    } else {
                        setError('Could not save your username. Please try again.');
                    }
                    setSaving(null);
                    return;
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: flagError } = await (supabase.from('profiles') as any)
                .update({ profile_setup_done: true })
                .eq('id', user.id);
            if (flagError) throw flagError;
            // Full reload so every gate and context re-reads the profile.
            window.location.assign(next);
        } catch {
            setError('Could not finish setup. Please try again.');
            setSaving(null);
        }
    };

    const cover = parseCover(coverValue);
    const busy = saving !== null || avatarBusy || coverBusy;

    return (
        <>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)] sm:p-7">
            <div className="flex flex-col gap-7">
                {/* Cover image */}
                <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-black">
                        Cover image <span className="ml-1 font-medium normal-case tracking-normal text-gray-400">optional</span>
                    </p>
                    <div className={`relative h-28 overflow-hidden rounded-2xl border border-gray-200 sm:h-32 ${cover.kind === 'preset' ? PRESET_SWATCH[cover.preset] : 'bg-gray-100'}`}>
                        {cover.kind === 'image' && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt="" className="h-full w-full object-cover" />
                        )}
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) => void uploadImage(event.target.files?.[0], 'cover')}
                        />
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => coverInputRef.current?.click()}
                            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-black disabled:opacity-60"
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                            {coverBusy ? 'Saving…' : coverValue ? 'Change cover' : 'Add cover'}
                        </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        {SETUP_COVER_PRESETS.map((preset) => {
                            const selected = coverValue === `preset:${preset}` || (preset === 'split' && !coverValue);
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    disabled={busy}
                                    aria-label={`${preset} cover`}
                                    onClick={() => void pickPreset(preset)}
                                    className={`relative flex h-8 w-12 items-center justify-center rounded-lg ${PRESET_SWATCH[preset]} ${selected ? 'ring-2 ring-black ring-offset-2' : 'border border-gray-200'} disabled:opacity-60`}
                                >
                                    {selected && <Check className={`h-3.5 w-3.5 ${preset === 'split' ? 'text-black' : preset === 'black' ? 'text-white' : 'text-black'}`} />}
                                </button>
                            );
                        })}
                        <p className="ml-1 text-[11px] font-medium text-gray-400">Or pick a style</p>
                    </div>
                </div>

                {/* Profile photo */}
                <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-black">
                        Profile photo <span className="ml-1 font-medium normal-case tracking-normal text-gray-400">optional</span>
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar
                                src={avatarUrl}
                                name={displayName || username || 'You'}
                                size="lg"
                                className="h-20 w-20 ring-1 ring-gray-200"
                            />
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(event) => void uploadImage(event.target.files?.[0], 'avatar')}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                aria-label="Add profile photo"
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-md transition-colors hover:bg-gray-800 disabled:opacity-60"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {avatarBusy ? 'Uploading…' : avatarUrl ? 'Looking good' : 'Add a profile photo'}
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-gray-500">JPG or PNG, up to 5&nbsp;MB. Shows next to your listings and bids.</p>
                        </div>
                    </div>
                </div>

                {/* Username */}
                <div>
                    <label htmlFor="setup-username" className="mb-3 block text-xs font-bold uppercase tracking-widest text-black">
                        Username
                    </label>
                    <div className={`flex items-center rounded-xl border bg-white transition-colors focus-within:border-black focus-within:ring-2 focus-within:ring-black ${usernameError ? 'border-red-300' : 'border-gray-200'}`}>
                        <span className="pl-4 text-sm font-semibold text-gray-400">@</span>
                        <input
                            id="setup-username"
                            value={username}
                            disabled={!profileLoaded || busy}
                            onChange={(event) => { setUsername(event.target.value); setUsernameError(''); }}
                            autoComplete="username"
                            className="w-full bg-transparent px-2 py-3 text-base text-black focus:outline-none disabled:opacity-60 sm:text-sm"
                        />
                    </div>
                    {usernameError && <p className="mt-2 text-xs font-medium text-red-600">{usernameError}</p>}
                </div>

                {error && (
                    <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-1">
                    <button
                        type="button"
                        disabled={!profileLoaded || busy}
                        onClick={() => void finish('save')}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-60"
                    >
                        {saving === 'save' ? 'Saving…' : 'Save and continue'}
                    </button>
                    <button
                        type="button"
                        disabled={!profileLoaded || busy}
                        onClick={() => void finish('skip')}
                        className="w-full py-2 text-center text-sm font-semibold text-gray-500 transition-colors hover:text-black disabled:opacity-60"
                    >
                        {saving === 'skip' ? 'One moment…' : 'Skip for now'}
                    </button>
                </div>
            </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
            Signed in as {typeof user.email === 'string' ? user.email : 'your new account'}. Everything here is editable anytime under Settings → Profile.
        </p>
        </>
    );
}

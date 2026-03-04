'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANDS = ['Apple', 'Samsung'] as const;
type Brand = (typeof BRANDS)[number];

const MODELS: Record<Brand, string[]> = {
    Apple: [
        'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
        'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
        'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
        'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
        'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
        'Other',
    ],
    Samsung: [
        'Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25',
        'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
        'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23',
        'Galaxy A55', 'Galaxy A54', 'Galaxy A35', 'Galaxy A34',
        'Galaxy Z Fold 6', 'Galaxy Z Flip 6',
        'Other',
    ],
};

const STORAGE_OPTIONS = [16, 32, 64, 128, 256, 512, 1024] as const;

const CONDITIONS = [
    { value: 'new', label: 'New', description: 'Sealed in box' },
    { value: 'like_new', label: 'Like New', description: 'No signs of use' },
    { value: 'good', label: 'Good', description: 'Minor wear, fully working' },
    { value: 'fair', label: 'Fair', description: 'Visible scratches, works fine' },
    { value: 'poor', label: 'Poor', description: 'Heavy wear or issues' },
] as const;

const DURATIONS = [
    { label: '1 Day', hours: 24 },
    { label: '3 Days', hours: 72 },
    { label: '5 Days', hours: 120 },
    { label: '7 Days', hours: 168 },
] as const;

const MAX_IMAGES = 6;
const MAX_FILE_SIZE_MB = 5;
const BUCKET = 'phone-images';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
    brand: Brand;
    model: string;
    storage_gb: number | '';
    condition: string;
    description: string;
    starting_price: string;
    duration_hours: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhoneListingForm() {
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createClient();
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<FormState>({
        brand: 'Apple',
        model: '',
        storage_gb: '',
        condition: 'good',
        description: '',
        starting_price: '',
        duration_hours: 72,
    });

    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    // ── Image handlers ──────────────────────────────────────────────────────────

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = Array.from(e.target.files ?? []);

        const valid = files.filter((f) => {
            if (!f.type.startsWith('image/')) return false;
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                setError(`"${f.name}" exceeds ${MAX_FILE_SIZE_MB} MB limit`);
                return false;
            }
            return true;
        });

        const remaining = MAX_IMAGES - images.length;
        const toAdd = valid.slice(0, remaining);

        setImages((prev) => [...prev, ...toAdd]);
        setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
        // Reset input so the same file can be re-selected if removed
        e.target.value = '';
    };

    const removeImage = (i: number) => {
        URL.revokeObjectURL(previews[i]);
        setImages((p) => p.filter((_, idx) => idx !== i));
        setPreviews((p) => p.filter((_, idx) => idx !== i));
    };

    // ── Upload images to Supabase storage ───────────────────────────────────────

    const uploadImages = async (auctionId: string): Promise<string[]> => {
        const urls: string[] = [];
        for (const img of images) {
            const ext = img.name.split('.').pop() ?? 'jpg';
            const path = `${user!.id}/${auctionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(path, img, { cacheControl: '3600', upsert: false });

            if (uploadError) {
                console.error('Upload error:', uploadError.message);
                continue;
            }

            const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
            urls.push(publicData.publicUrl);
        }
        return urls;
    };

    // ── Submit ───────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setError(null);

        if (!user) return setError('Please log in to create a listing');
        if (!form.model) return setError('Please select a model');
        if (!form.starting_price || Number(form.starting_price) <= 0)
            return setError('Please enter a valid starting price');

        setUploading(true);

        // 1. Create the auction record
        const endsAt = new Date(Date.now() + form.duration_hours * 3600 * 1000).toISOString();
        const startingPrice = Number(form.starting_price);

        const { data: auction, error: auctionErr } = await supabase
            .from('auctions')
            .insert({
                seller_id: user.id,
                title: `${form.brand} ${form.model}${form.storage_gb ? ` ${form.storage_gb}GB` : ''}`,
                description: form.description || null,
                brand: form.brand,
                model: form.model,
                storage_gb: form.storage_gb || null,
                condition: form.condition,
                starting_price: startingPrice,
                current_price: startingPrice,
                min_increment: 5,
                ends_at: endsAt,
            } as any)
            .select('id')
            .single();

        if (auctionErr || !auction) {
            setError(auctionErr?.message ?? 'Failed to create listing');
            setUploading(false);
            return;
        }

        const auctionId = (auction as any).id as string;

        // 2. Upload images to "phone-images" bucket
        if (images.length > 0) {
            const urls = await uploadImages(auctionId);

            if (urls.length > 0) {
                await supabase.from('auction_images').insert(
                    urls.map((url, position) => ({ auction_id: auctionId, url, position })) as any
                );
            }
        }

        setUploading(false);
        router.push(`/auctions/${auctionId}`);
    };

    // ── Shared styles ────────────────────────────────────────────────────────────

    const input =
        'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors';

    const chip = (active: boolean) =>
        `py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer select-none ${active
            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
        }`;

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-lg mx-auto">

            {/* Step indicator */}
            <div className="flex items-center mb-8">
                {['Details', 'Photos', 'Pricing'].map((label, i) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1
                                    ? 'bg-emerald-600 text-white'
                                    : step === i + 1
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                }`}
                        >
                            {step > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className="text-[11px] text-gray-400 hidden sm:block">{label}</span>
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* ── Step 1: Phone Details ─── */}
            {step === 1 && (
                <div className="space-y-5">
                    {/* Brand toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Brand</label>
                        <div className="grid grid-cols-2 gap-3">
                            {BRANDS.map((b) => (
                                <button
                                    key={b}
                                    type="button"
                                    onClick={() => { set('brand', b); set('model', ''); }}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${form.brand === b
                                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }`}
                                >
                                    <span>{b === 'Apple' ? '🍎' : '📱'}</span>
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Model <span className="text-red-500">*</span>
                        </label>
                        <select className={input} value={form.model} onChange={(e) => set('model', e.target.value)}>
                            <option value="">Select a model</option>
                            {MODELS[form.brand].map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Storage */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Storage</label>
                        <div className="flex gap-2 flex-wrap">
                            {STORAGE_OPTIONS.map((gb) => (
                                <button
                                    key={gb}
                                    type="button"
                                    onClick={() => set('storage_gb', gb)}
                                    className={chip(form.storage_gb === gb)}
                                >
                                    {gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Condition */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition</label>
                        <div className="space-y-2">
                            {CONDITIONS.map(({ value, label, description }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => set('condition', value)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${form.condition === value
                                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <div
                                        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${form.condition === value
                                                ? 'border-emerald-600 bg-emerald-600'
                                                : 'border-gray-400'
                                            }`}
                                    />
                                    <div>
                                        <p className={`text-sm font-semibold ${form.condition === value ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {label}
                                        </p>
                                        <p className="text-xs text-gray-400">{description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            className={`${input} resize-none`}
                            placeholder="Accessories included, reason for selling, any faults..."
                            value={form.description}
                            onChange={(e) => set('description', e.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (!form.model) return setError('Please select a model');
                            setError(null);
                            setStep(2);
                        }}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
                    >
                        Next: Add Photos →
                    </button>
                </div>
            )}

            {/* ── Step 2: Photos ─── */}
            {step === 2 && (
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Photos ({images.length}/{MAX_IMAGES})
                        </p>
                        <p className="text-xs text-gray-400 mb-3">
                            Uploads to <code className="text-emerald-600">phone-images</code> bucket · JPG, PNG, WebP · max {MAX_FILE_SIZE_MB} MB each
                        </p>

                        {/* Upload zone */}
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={images.length >= MAX_IMAGES}
                            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-10 flex flex-col items-center gap-2 hover:border-emerald-500 transition-colors disabled:opacity-40"
                        >
                            <span className="text-4xl">📷</span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {images.length >= MAX_IMAGES ? 'Maximum photos reached' : 'Tap to add photos'}
                            </p>
                        </button>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                    </div>

                    {/* Previews grid */}
                    {previews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {previews.map((src, i) => (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                                    {i === 0 && (
                                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                            Cover
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white text-sm leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove photo"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            ← Back
                        </button>
                        <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
                            Next: Set Price →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Pricing ─── */}
            {step === 3 && (
                <div className="space-y-5">
                    {/* Review summary */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Listing summary</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {form.brand} {form.model}
                            {form.storage_gb ? ` · ${form.storage_gb}GB` : ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            Condition: {form.condition.replace('_', ' ')} · {images.length} photo{images.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Starting price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Starting price (₵) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₵</span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                className={`${input} pl-8`}
                                placeholder="e.g. 500.00"
                                value={form.starting_price}
                                onChange={(e) => set('starting_price', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Auction duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Auction duration
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {DURATIONS.map(({ label, hours }) => (
                                <button
                                    key={hours}
                                    type="button"
                                    onClick={() => set('duration_hours', hours)}
                                    className={chip(form.duration_hours === hours)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            ← Back
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={uploading}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                        >
                            {uploading ? '⏳ Publishing…' : '🚀 Publish Listing'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

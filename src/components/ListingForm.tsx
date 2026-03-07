'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ITEM_CATEGORIES, CONDITION_LABELS, AUCTION_DURATIONS } from '@/lib/constants';

interface FormData {
    title: string;
    brand: string;
    model: string;
    storage_gb: string;
    ram_gb: string;
    condition: string;
    description: string;
    starting_price: string;
    min_increment: string;
    duration_hours: number;
}

const INITIAL: FormData = {
    title: '',
    brand: 'Phones & Tablets',
    model: '',
    storage_gb: '',
    ram_gb: '',
    condition: 'good',
    description: '',
    starting_price: '',
    min_increment: '5',
    duration_hours: 72,
};

export default function ListingForm() {
    const { user } = useAuth();
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<FormData>(INITIAL);
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (field: keyof FormData, value: string | number) =>
        setForm((f) => ({ ...f, [field]: value }));

    const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []).slice(0, 6 - images.length);
        setImages((p) => [...p, ...files]);
        setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
    };

    const removeImage = (i: number) => {
        URL.revokeObjectURL(previews[i]);
        setImages((p) => p.filter((_, idx) => idx !== i));
        setPreviews((p) => p.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async () => {
        if (!user) return setError('Please log in first');
        if (!form.title || !form.starting_price) return setError('Please fill in required fields');

        setSubmitting(true);
        setError(null);

        const endsAt = new Date(Date.now() + form.duration_hours * 3600 * 1000).toISOString();
        const body = {
            seller_id: user.id,
            title: form.title,
            description: form.description || null,
            brand: form.brand,
            model: form.model,
            storage_gb: form.storage_gb ? Number(form.storage_gb) : null,
            ram_gb: form.ram_gb ? Number(form.ram_gb) : null,
            condition: form.condition,
            starting_price: Number(form.starting_price),
            current_price: Number(form.starting_price),
            min_increment: Number(form.min_increment),
            ends_at: endsAt,
        };

        const res = await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!res.ok || json.error) {
            setError(json.error ?? 'Failed to create listing');
            setSubmitting(false);
            return;
        }

        // Upload images if any
        if (images.length > 0 && json.id) {
            const fd = new FormData();
            images.forEach((img) => fd.append('images', img));
            fd.append('auction_id', json.id);
            await fetch('/api/listings/images', { method: 'POST', body: fd });
        }

        router.push(`/auctions/${json.id}`);
    };

    // ── Shared input styles ──
    const inputCls =
        'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors';

    return (
        <div className="max-w-lg mx-auto px-4">
            {/* Step tabs */}
            <div className="flex mb-6">
                {(['Details', 'Photos', 'Price'] as const).map((label, i) => (
                    <div key={label} className="flex-1 flex flex-col items-center">
                        <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${step > i + 1
                                    ? 'bg-emerald-600 text-white'
                                    : step === i + 1
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                }`}
                        >
                            {step > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className="text-[11px] text-gray-400">{label}</span>
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Step 1 — Details */}
            {step === 1 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Listing title <span className="text-red-500">*</span>
                        </label>
                        <input
                            className={inputCls}
                            placeholder="e.g. iPhone 14 Pro Max 256GB Deep Purple"
                            value={form.title}
                            onChange={(e) => set('title', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select className={inputCls} value={form.brand} onChange={(e) => set('brand', e.target.value)}>
                                {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Brand / Variant
                            </label>
                            <input
                                className={inputCls}
                                placeholder="e.g. Samsung, Nike…"
                                value={form.model}
                                onChange={(e) => set('model', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => set('condition', key)}
                                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${form.condition === key
                                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            className={`${inputCls} resize-none`}
                            rows={3}
                            placeholder="Describe the item's condition, what's included, reason for selling…"
                            value={form.description}
                            onChange={(e) => set('description', e.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
                    >
                        Next: Add Photos →
                    </button>
                </div>
            )}

            {/* Step 2 — Photos */}
            {step === 2 && (
                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-2 hover:border-emerald-500 transition-colors"
                    >
                        <span className="text-3xl">📷</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tap to add photos ({images.length}/6)</p>
                        <p className="text-xs text-gray-400">JPG, PNG, WebP · max 5 MB</p>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />

                    {previews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {previews.map((src, i) => (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                    {i === 0 && (
                                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md">
                                            Cover
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Step 3 — Price */}
            {step === 3 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Starting price (₵) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₵</span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                className={`${inputCls} pl-7`}
                                placeholder="100.00"
                                value={form.starting_price}
                                onChange={(e) => set('starting_price', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min. bid increment (₵)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₵</span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                className={`${inputCls} pl-7`}
                                placeholder="5.00"
                                value={form.min_increment}
                                onChange={(e) => set('min_increment', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {AUCTION_DURATIONS.map(({ label, hours }) => (
                                <button
                                    key={hours}
                                    type="button"
                                    onClick={() => set('duration_hours', hours)}
                                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${form.duration_hours === hours
                                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}
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
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                        >
                            {submitting ? '⏳ Publishing…' : '🚀 Publish'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

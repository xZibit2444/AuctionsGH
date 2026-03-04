'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { createAuctionSchema, type CreateAuctionInput } from '@/lib/validators';
import {
    PHONE_BRANDS,
    CONDITION_LABELS,
    STORAGE_OPTIONS,
    RAM_OPTIONS,
    AUCTION_DURATIONS,
    MAX_IMAGES_PER_AUCTION,
} from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function CreateAuctionForm() {
    const router = useRouter();
    const supabase = createClient();
    const { user } = useAuth();
    const { uploadImage, uploading } = useImageUpload();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CreateAuctionInput>({
        title: '',
        description: '',
        brand: 'Apple',
        model: '',
        storage_gb: undefined,
        ram_gb: undefined,
        condition: 'good',
        starting_price: 0,
        min_increment: 5,
        duration_hours: 72,
    });
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const update = (field: keyof CreateAuctionInput, value: unknown) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        const remaining = MAX_IMAGES_PER_AUCTION - images.length;
        const toAdd = files.slice(0, remaining);

        setImages([...images, ...toAdd]);
        setPreviews([
            ...previews,
            ...toAdd.map((f) => URL.createObjectURL(f)),
        ]);
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previews[index]);
        setImages(images.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setErrors({});
        const result = createAuctionSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                fieldErrors[issue.path[0] as string] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        if (!user) return;
        setSubmitting(true);

        const endsAt = new Date(
            Date.now() + formData.duration_hours * 60 * 60 * 1000
        ).toISOString();

        // Create auction
        const { data: auction, error: auctionError } = await supabase
            .from('auctions')
            .insert({
                seller_id: user.id,
                title: formData.title,
                description: formData.description || null,
                brand: formData.brand,
                model: formData.model,
                storage_gb: formData.storage_gb || null,
                ram_gb: formData.ram_gb || null,
                condition: formData.condition,
                starting_price: formData.starting_price,
                current_price: formData.starting_price,
                min_increment: formData.min_increment,
                ends_at: endsAt,
            } as any)
            .select()
            .single();

        if (auctionError || !auction) {
            setErrors({ submit: auctionError?.message ?? 'Failed to create auction' });
            setSubmitting(false);
            return;
        }

        // Upload images
        for (let i = 0; i < images.length; i++) {
            const result = await uploadImage(images[i], user.id, (auction as any).id);
            if (result) {
                await supabase.from('auction_images').insert({
                    auction_id: (auction as any).id,
                    url: result.url,
                    position: i,
                } as any);
            }
        }

        setSubmitting(false);
        router.push(`/auctions/${(auction as any).id}`);
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
                {['Phone Details', 'Images', 'Pricing'].map((label, i) => (
                    <div key={label} className="flex items-center gap-2 flex-1">
                        <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${step > i + 1
                                ? 'bg-emerald-600 text-white'
                                : step === i + 1
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                                }`}
                        >
                            {step > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                            {label}
                        </span>
                        {i < 2 && (
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        )}
                    </div>
                ))}
            </div>

            {errors.submit && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    {errors.submit}
                </div>
            )}

            {/* Step 1: Phone Details */}
            {step === 1 && (
                <div className="space-y-4">
                    <Input
                        id="title"
                        label="Listing Title"
                        placeholder="iPhone 14 Pro Max 256GB Deep Purple"
                        value={formData.title}
                        onChange={(e) => update('title', e.target.value)}
                        error={errors.title}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                            <select
                                value={formData.brand}
                                onChange={(e) => update('brand', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                            >
                                {PHONE_BRANDS.map((brand) => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                        </div>

                        <Input
                            id="model"
                            label="Model"
                            placeholder="14 Pro Max"
                            value={formData.model}
                            onChange={(e) => update('model', e.target.value)}
                            error={errors.model}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Storage</label>
                            <select
                                value={formData.storage_gb ?? ''}
                                onChange={(e) => update('storage_gb', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                            >
                                <option value="">Select</option>
                                {STORAGE_OPTIONS.map((gb) => (
                                    <option key={gb} value={gb}>{gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">RAM</label>
                            <select
                                value={formData.ram_gb ?? ''}
                                onChange={(e) => update('ram_gb', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                            >
                                <option value="">Select</option>
                                {RAM_OPTIONS.map((gb) => (
                                    <option key={gb} value={gb}>{gb} GB</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => update('condition', key)}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${formData.condition === key
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
                        <textarea
                            rows={4}
                            value={formData.description ?? ''}
                            onChange={(e) => update('description', e.target.value)}
                            placeholder="Describe the phone's condition, accessories included, reason for selling..."
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors resize-none"
                        />
                    </div>

                    <Button onClick={() => setStep(2)} className="w-full">
                        Next: Add Photos →
                    </Button>
                </div>
            )}

            {/* Step 2: Images */}
            {step === 2 && (
                <div className="space-y-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tap to add photos ({images.length}/{MAX_IMAGES_PER_AUCTION})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP · Max 5 MB each</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleImageAdd}
                    />

                    {previews.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            {previews.map((src, i) => (
                                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(i)}
                                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    {i === 0 && (
                                        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-lg">
                                            Cover
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                            ← Back
                        </Button>
                        <Button onClick={() => setStep(3)} className="flex-1">
                            Next: Set Price →
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
                <div className="space-y-4">
                    <Input
                        id="starting_price"
                        type="number"
                        label="Starting Price"
                        prefix="₵"
                        placeholder="100.00"
                        value={formData.starting_price || ''}
                        onChange={(e) => update('starting_price', e.target.value)}
                        error={errors.starting_price}
                    />

                    <Input
                        id="min_increment"
                        type="number"
                        label="Minimum Bid Increment"
                        prefix="₵"
                        placeholder="5.00"
                        value={formData.min_increment || ''}
                        onChange={(e) => update('min_increment', e.target.value)}
                        error={errors.min_increment}
                    />

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Auction Duration
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {AUCTION_DURATIONS.map(({ label, hours }) => (
                                <button
                                    key={hours}
                                    type="button"
                                    onClick={() => update('duration_hours', hours)}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${formData.duration_hours === hours
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                            ← Back
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            isLoading={submitting || uploading}
                            className="flex-1"
                        >
                            🚀 Publish Auction
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

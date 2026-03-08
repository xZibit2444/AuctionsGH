'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { createAuctionSchema, type CreateAuctionInput } from '@/lib/validators';
import {
    ITEM_CATEGORIES,
    CONDITION_LABELS,
    MAX_IMAGES_PER_AUCTION,
    LISTING_CITIES,
    ACCRA_MEETUP_AREAS,
} from '@/lib/constants';
import {
    Upload, X, Check, ArrowRight, ArrowLeft, AlertTriangle, ImagePlus, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

const STEPS = ['Item Details', 'Photos', 'Pricing'];

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
    return (
        <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
            {children}
            {optional && <span className="font-medium text-gray-400 normal-case ml-1">(optional)</span>}
        </label>
    );
}

function SelectInput({ value, onChange, children }: {
    value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className="w-full border border-gray-200 px-4 py-3 text-sm text-black bg-white focus:outline-none focus:border-black transition-colors appearance-none cursor-pointer"
            >
                {children}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}

export default function CreateAuctionForm() {
    const router = useRouter();
    const supabase = createClient();
    const { user } = useAuth();
    const { uploadImage, uploading } = useImageUpload();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CreateAuctionInput>({
        title: '',
        description: '',
        brand: 'Phones & Tablets',
        model: '',
        storage_gb: undefined,
        condition: 'good',
        starting_price: 0,
        min_increment: 50,
        duration_hours: 72,
        duration_minutes: 0,
        listing_city: 'Accra',
        meetup_area: 'Accra Central',
        delivery_available: true,
        inspection_available: true,
        winner_note: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [publishedAuctionId, setPublishedAuctionId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const update = (field: keyof CreateAuctionInput, value: unknown) =>
        setFormData({ ...formData, [field]: value });

    const handleImageAdd = (files: FileList | File[]) => {
        const arr = Array.from(files);
        const remaining = MAX_IMAGES_PER_AUCTION - images.length;
        const toAdd = arr.slice(0, remaining);
        setImages([...images, ...toAdd]);
        setPreviews([...previews, ...toAdd.map((f) => URL.createObjectURL(f))]);
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previews[index]);
        setImages(images.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setErrors({});
        const result = createAuctionSchema.safeParse(formData);

        // Zod Validation Check
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                fieldErrors[issue.path[0] as string] = issue.message;
            });
            setErrors(fieldErrors);

            // If validation fails on step 3 but the error is on step 1/2, jump back to it
            if (fieldErrors.title || fieldErrors.brand || fieldErrors.listing_city || fieldErrors.meetup_area) setStep(1);
            else if (fieldErrors.images) setStep(2);

            return;
        }

        if (!user) {
            setErrors({ submit: 'You must be logged in to post an auction.' });
            return;
        }

        if (images.length === 0) {
            setErrors({ submit: 'Please add at least one photo of the item.' });
            setStep(2);
            return;
        }

        setSubmitting(true);

        // Listings are permanent — stays active until seller accepts an offer.
        const endsAt = new Date('2099-12-31T23:59:59Z').toISOString();

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: auction, error: auctionError } = await (supabase.from('auctions') as any)
                .insert({
                    seller_id: user.id,
                    title: formData.title,
                    description: formData.description || null,
                    brand: formData.brand,
                    model: formData.model,
                    storage_gb: formData.storage_gb || null,
                    condition: formData.condition,
                    starting_price: formData.starting_price,
                    current_price: formData.starting_price,
                    min_increment: formData.min_increment,
                    ends_at: endsAt,
                    listing_city: formData.listing_city,
                    meetup_area: formData.meetup_area,
                    delivery_available: formData.delivery_available,
                    inspection_available: formData.inspection_available,
                })
                .select()
                .single();

            if (auctionError || !auction) {
                setErrors({ submit: auctionError?.message ?? 'Failed to create auction' });
                return;
            }

            const winnerNote = (formData.winner_note ?? '').trim();
            if (winnerNote) {
                // Save private seller instructions visible only to the winning buyer via RLS.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: noteError } = await (supabase.from('auction_winner_notes') as any).insert({
                    auction_id: (auction as { id: string }).id,
                    seller_id: user.id,
                    note: winnerNote,
                });

                if (noteError) {
                    console.error('Failed to save winner-only note:', noteError.message);
                }
            }

            // Upload all images in parallel with a 30-second timeout per image
            const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
                Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

            const auctionId = (auction as { id: string }).id;
            const uploadResults = await Promise.all(
                images.map((img, i) =>
                    withTimeout(uploadImage(img, user.id, auctionId), 30000)
                        .then(res => ({ res, i }))
                        .catch(() => ({ res: null, i }))
                )
            );

            const imageInserts = uploadResults
                .filter(({ res }) => res !== null)
                .map(({ res, i }) => ({
                    auction_id: auctionId,
                    url: res!.url,
                    position: i,
                }));

            if (imageInserts.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: imgError } = await (supabase.from('auction_images') as any).insert(imageInserts);
                if (imgError) console.error('Failed to save image records:', imgError.message);
            }

            setPublishedAuctionId(auctionId);
        } catch (err) {
            setErrors({ submit: 'An unexpected error occurred during publishing. Please try again.' });
        } finally {
            setSubmitting(false);
        }

        // Refresh router data immediately so homepage cache updates before user clicks "View Listing" or "Home"
        router.refresh();
    };

    if (publishedAuctionId) {
        return (
            <div className="max-w-md mx-auto text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-black text-black tracking-tight mb-2">Auction Published!</h2>
                <p className="text-gray-500 mb-8">Your listing is now live and accepting bids.</p>

                <div className="space-y-3">
                    <Link
                        href={`/auctions/${publishedAuctionId}`}
                        className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 text-sm font-bold hover:bg-gray-900 transition-colors"
                    >
                        View Live Listing <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/"
                        className="w-full flex items-center justify-center border border-gray-200 py-3 text-sm font-bold text-black hover:border-black transition-colors"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center mb-10">
                {STEPS.map((label, i) => (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 flex items-center justify-center text-xs font-black shrink-0 transition-colors duration-300 ${step > i + 1
                                ? 'bg-black text-white'
                                : step === i + 1
                                    ? 'bg-black text-white ring-4 ring-black/10'
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <span className={`text-xs font-semibold hidden sm:block transition-colors duration-200 ${step === i + 1 ? 'text-black' : 'text-gray-400'
                                }`}>{label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-px mx-3 transition-colors duration-500 ${step > i + 1 ? 'bg-black' : 'bg-gray-200'}`} />
                        )}
                    </div>
                ))}
            </div>

            {errors.submit && (
                <div className="flex items-center gap-2 mb-5 border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {errors.submit}
                </div>
            )}

            {/* ── Step 1: Item Details ── */}
            {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Title */}
                    <div>
                        <FieldLabel>Listing Title</FieldLabel>
                        <input
                            value={formData.title}
                            onChange={(e) => update('title', e.target.value)}
                            placeholder="iPhone 14 Pro Max 256GB Deep Purple"
                            className={`w-full border px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
                    </div>

                    {/* Category + Type/Variant */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>Category</FieldLabel>
                            <SelectInput value={formData.brand} onChange={(e) => update('brand', e.target.value)}>
                                {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </SelectInput>
                        </div>
                        <div>
                            <FieldLabel optional>Brand / Variant</FieldLabel>
                            <input
                                value={formData.model ?? ''}
                                onChange={(e) => update('model', e.target.value)}
                                placeholder="e.g. Samsung, Nike, Toyota…"
                                className="w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors"
                            />
                        </div>
                    </div>

                    {/* Condition */}
                    <div>
                        <FieldLabel>Condition</FieldLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => update('condition', key)}
                                    className={`px-3 py-2.5 text-sm font-semibold border transition-all duration-150 ${formData.condition === key
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <FieldLabel optional>Description</FieldLabel>
                        <textarea
                            rows={3}
                            value={formData.description ?? ''}
                            onChange={(e) => update('description', e.target.value)}
                            placeholder="Describe the item's condition, what's included, reason for selling…"
                            className="w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors resize-none"
                        />
                    </div>

                    <div>
                        <FieldLabel optional>Winner-Only Note</FieldLabel>
                        <textarea
                            rows={3}
                            value={formData.winner_note ?? ''}
                            onChange={(e) => update('winner_note', e.target.value)}
                            placeholder="Private note only the winning buyer can see (e.g. best contact hours, pickup instruction)."
                            className={`w-full border px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors resize-none ${errors.winner_note ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors.winner_note && <p className="text-[11px] text-red-500 mt-1">{errors.winner_note}</p>}
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>City</FieldLabel>
                            <SelectInput value={formData.listing_city} onChange={(e) => update('listing_city', e.target.value)}>
                                {LISTING_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                            </SelectInput>
                            {errors.listing_city && <p className="text-[11px] text-red-500 mt-1">{errors.listing_city}</p>}
                        </div>
                        <div>
                            <FieldLabel>Meetup Area</FieldLabel>
                            <SelectInput value={formData.meetup_area} onChange={(e) => update('meetup_area', e.target.value)}>
                                {ACCRA_MEETUP_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
                            </SelectInput>
                            {errors.meetup_area && <p className="text-[11px] text-red-500 mt-1">{errors.meetup_area}</p>}
                        </div>
                    </div>

                    {/* Buyer-facing logistics options */}
                    <div>
                        <FieldLabel>Handover Options</FieldLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => update('delivery_available', !formData.delivery_available)}
                                className={`px-3 py-2.5 text-sm font-semibold border transition-all duration-150 ${formData.delivery_available
                                    ? 'border-black bg-black text-white'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                Delivery Available
                            </button>
                            <button
                                type="button"
                                onClick={() => update('inspection_available', !formData.inspection_available)}
                                className={`px-3 py-2.5 text-sm font-semibold border transition-all duration-150 ${formData.inspection_available
                                    ? 'border-black bg-black text-white'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                Meet & Inspect Available
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors"
                    >
                        Next: Add Photos <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* ── Step 2: Images ── */}
            {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Drop zone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleImageAdd(e.dataTransfer.files); }}
                        className={`border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 ${dragOver
                            ? 'border-black bg-gray-50 scale-[1.01]'
                            : 'border-gray-300 hover:border-black hover:bg-gray-50/50'
                            }`}
                    >
                        <div className="w-12 h-12 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                            <ImagePlus className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-semibold text-black">
                            {dragOver ? 'Drop to upload' : 'Click or drag photos here'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {images.length}/{MAX_IMAGES_PER_AUCTION} photos · JPG, PNG or WebP · Max 5 MB each
                        </p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleImageAdd(e.target.files!)}
                    />

                    {previews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {previews.map((src, i) => (
                                <div key={i} className="relative group aspect-square overflow-hidden bg-gray-100">
                                    <img
                                        src={src}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <button
                                        onClick={() => removeImage(i)}
                                        className="absolute top-2 right-2 h-6 w-6 bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                    {i === 0 && (
                                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
                                            Cover
                                        </span>
                                    )}
                                </div>
                            ))}
                            {images.length < MAX_IMAGES_PER_AUCTION && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-black hover:text-black transition-colors duration-200"
                                >
                                    <Upload className="h-5 w-5" strokeWidth={1.5} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 py-3 text-sm font-semibold text-black hover:border-black transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors"
                        >
                            Next: Set Price <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Pricing ── */}
            {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Starting price */}
                    <div>
                        <FieldLabel>Starting Price</FieldLabel>
                        <div className={`flex border focus-within:border-black transition-colors ${errors.starting_price ? 'border-red-400' : 'border-gray-200'}`}>
                            <div className="flex items-center px-4 bg-gray-50 border-r border-gray-200 shrink-0">
                                <span className="text-sm font-semibold text-gray-500">GHS</span>
                            </div>
                            <input
                                type="number"
                                value={formData.starting_price || ''}
                                onChange={(e) => update('starting_price', Number(e.target.value))}
                                placeholder="100.00"
                                className="flex-1 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none"
                            />
                        </div>
                        {errors.starting_price && <p className="text-[11px] text-red-500 mt-1">{errors.starting_price}</p>}
                    </div>

                    {/* Min increment */}
                    <div>
                        <FieldLabel>Minimum Bid Increment</FieldLabel>
                        <div className={`flex border focus-within:border-black transition-colors ${errors.min_increment ? 'border-red-400' : 'border-gray-200'}`}>
                            <div className="flex items-center px-4 bg-gray-50 border-r border-gray-200 shrink-0">
                                <span className="text-sm font-semibold text-gray-500">GHS</span>
                            </div>
                            <input
                                type="number"
                                value={formData.min_increment || ''}
                                onChange={(e) => update('min_increment', Number(e.target.value))}
                                placeholder="50.00"
                                className="flex-1 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none"
                            />
                        </div>
                        {errors.min_increment && <p className="text-[11px] text-red-500 mt-1">{errors.min_increment}</p>}
                    </div>

                    {/* Permanent listing notice */}
                    <div className="flex items-start gap-3 border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-black">Listing stays live until you accept an offer</p>
                            <p className="text-xs text-gray-500 mt-0.5">Your listing will remain active with no expiry. You can close it any time from your dashboard.</p>
                        </div>
                    </div>

                    {/* Summary box */}
                    <div className="border border-gray-200 p-4 space-y-2 bg-gray-50">
                        <p className="text-[11px] font-black text-black uppercase tracking-widest mb-3">Listing Summary</p>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Phone</span>
                            <span className="font-semibold text-black">{formData.brand} {formData.model || '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Condition</span>
                            <span className="font-semibold text-black">{CONDITION_LABELS[formData.condition] ?? formData.condition}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Starting at</span>
                            <span className="font-semibold text-black">GHS {formData.starting_price || '0'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Photos</span>
                            <span className="font-semibold text-black">{images.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Location</span>
                            <span className="font-semibold text-black">{formData.listing_city}, {formData.meetup_area}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Delivery</span>
                            <span className="font-semibold text-black">{formData.delivery_available ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Inspection</span>
                            <span className="font-semibold text-black">{formData.inspection_available ? 'Yes' : 'No'}</span>
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {errors.submit}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 py-3 text-sm font-semibold text-black hover:border-black transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60"
                        >
                            {submitting
                                ? 'Publishing…'
                                : <><span>Publish Auction</span><ArrowRight className="h-4 w-4" /></>
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { updateListingAction } from '@/app/actions/updateListing';
import { isPermanentListing } from '@/lib/listings';
import {
    CONDITION_LABELS,
    GHANA_REGIONS,
    ITEM_CATEGORIES,
    getLocationsForRegion,
} from '@/lib/constants';
import { SIM_TYPE_OPTIONS, NETWORK_LOCK_OPTIONS, specFieldsForCategory } from '@/lib/listingEdit';

type Condition = 'new' | 'brand_new' | 'like_new' | 'good' | 'fair' | 'poor';

type FormState = {
    title: string;
    description: string;
    brand: string;
    model: string;
    storage_gb: string;
    battery_health: string;
    sim_type: string;
    network_lock: string;
    faults: string;
    condition: Condition;
    price: string;
    listing_city: string;
    meetup_area: string;
    delivery_available: boolean;
    inspection_available: boolean;
};

const REGION_OPTIONS = ['Accra', ...GHANA_REGIONS];

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
    return (
        <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
            {children}
            {optional && <span className="font-medium text-gray-400 normal-case ml-1">(optional)</span>}
        </label>
    );
}

const inputClass =
    'w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors';

export default function EditListingForm({ auctionId }: { auctionId: string }) {
    const router = useRouter();
    const supabase = createClient();
    const { user, profile } = useAuth();

    const [form, setForm] = useState<FormState | null>(null);
    const [status, setStatus] = useState<string>('');
    const [bidCount, setBidCount] = useState(0);
    const [permanent, setPermanent] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error: loadErr } = await (supabase.from('auctions') as any)
                .select('*')
                .eq('id', auctionId)
                .maybeSingle();
            if (cancelled) return;
            if (loadErr || !data) {
                setLoadError('Listing not found.');
                return;
            }
            if (data.seller_id !== user.id && !profile?.is_super_admin) {
                setLoadError('You can only edit your own listings.');
                return;
            }
            setStatus(data.status);
            setBidCount(data.bid_count ?? 0);
            setPermanent(isPermanentListing(data.ends_at));
            setForm({
                title: data.title ?? '',
                description: data.description ?? '',
                brand: data.brand ?? 'Other',
                model: data.model ?? '',
                storage_gb: data.storage_gb ? String(data.storage_gb) : '',
                battery_health: data.battery_health != null ? String(data.battery_health) : '',
                sim_type: data.sim_type ?? '',
                network_lock: data.network_lock ?? '',
                faults: data.faults ?? '',
                condition: (data.condition ?? 'good') as Condition,
                price: String(data.starting_price ?? data.current_price ?? ''),
                listing_city: data.listing_city ?? 'Greater Accra',
                meetup_area: data.meetup_area ?? '',
                delivery_available: Boolean(data.delivery_available),
                inspection_available: Boolean(data.inspection_available),
            });
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, auctionId, profile?.is_super_admin]);

    if (loadError) {
        return (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}{' '}
                <Link href="/dashboard" className="underline">Back to dashboard</Link>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    const priceLocked = bidCount > 0 && !permanent;
    const blocked = status === 'sold';
    const areaOptions = getLocationsForRegion(form.listing_city).filter(
        (a) => !a.startsWith('Other')
    );

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

    // Only the spec fields that apply to the selected category are shown and saved.
    const specFields = specFieldsForCategory(form.brand);

    const handleCategoryChange = (category: string) => {
        const visible = specFieldsForCategory(category);
        setForm((prev) =>
            prev
                ? {
                      ...prev,
                      brand: category,
                      storage_gb: visible.storage ? prev.storage_gb : '',
                      battery_health: visible.battery ? prev.battery_health : '',
                      sim_type: visible.sim ? prev.sim_type : '',
                      network_lock: visible.lock ? prev.network_lock : '',
                  }
                : prev
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        setSaved(false);
        setSaving(true);
        const result = await updateListingAction(auctionId, {
            title: form.title,
            description: form.description,
            brand: form.brand,
            model: form.model,
            storage_gb: specFields.storage && form.storage_gb ? Number(form.storage_gb) : null,
            battery_health: specFields.battery ? form.battery_health : '',
            sim_type: specFields.sim ? form.sim_type : '',
            network_lock: specFields.lock ? form.network_lock : '',
            faults: form.faults,
            condition: form.condition,
            price: priceLocked ? undefined : Number(form.price),
            listing_city: form.listing_city,
            meetup_area: form.meetup_area,
            delivery_available: form.delivery_available,
            inspection_available: form.inspection_available,
        });
        setSaving(false);
        if (!result.success) {
            setError(result.error ?? 'Could not save changes.');
            setFieldErrors(result.fieldErrors ?? {});
            return;
        }
        setSaved(true);
        router.refresh();
    };

    const err = (k: string) => fieldErrors[k] && <p className="text-[11px] text-red-500 mt-1">{fieldErrors[k]}</p>;

    return (
        <form onSubmit={handleSave} className="space-y-5">
            {blocked && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    This listing has an active deal, so it cannot be edited right now.
                </div>
            )}
            {error && (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {saved && (
                <div className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    Saved. Your link stays the same.{' '}
                    <Link href={`/auctions/${auctionId}`} className="underline font-semibold">View listing</Link>
                </div>
            )}

            <fieldset disabled={blocked || saving} className="space-y-5">
                <div>
                    <Label>Listing Title</Label>
                    <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
                    {err('title')}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Category</Label>
                        <select value={form.brand} onChange={(e) => handleCategoryChange(e.target.value)} className={inputClass}>
                            {[...ITEM_CATEGORIES, ...(ITEM_CATEGORIES.includes(form.brand as never) ? [] : [form.brand])].map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label optional>Brand / Model</Label>
                        <input
                            value={form.model}
                            onChange={(e) => set('model', e.target.value)}
                            placeholder="e.g. Samsung A16"
                            className={inputClass}
                        />
                        {err('model')}
                    </div>
                </div>

                <div className={`grid gap-4 ${specFields.storage ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {specFields.storage && (
                    <div>
                        <Label optional>Storage (GB)</Label>
                        <input
                            type="number"
                            min={0}
                            value={form.storage_gb}
                            onChange={(e) => set('storage_gb', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    )}
                    <div>
                        <Label>Condition</Label>
                        <select
                            value={form.condition}
                            onChange={(e) => set('condition', e.target.value as Condition)}
                            className={inputClass}
                        >
                            {Object.entries(CONDITION_LABELS).map(([k, label]) => (
                                <option key={k} value={k}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <Label>{permanent ? 'Price (GHS)' : 'Starting Price (GHS)'}</Label>
                    <input
                        type="number"
                        min={1}
                        step="any"
                        value={form.price}
                        onChange={(e) => set('price', e.target.value)}
                        disabled={priceLocked}
                        className={inputClass}
                    />
                    {priceLocked && (
                        <p className="text-[11px] text-gray-500 mt-1">Price is locked because bids have been placed.</p>
                    )}
                    {err('price')}
                </div>

                {(specFields.battery || specFields.sim) && (
                <div className={`grid gap-4 ${specFields.battery && specFields.sim ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {specFields.battery && (
                    <div>
                        <Label optional>Battery health (%)</Label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={form.battery_health}
                            onChange={(e) => set('battery_health', e.target.value)}
                            className={inputClass}
                        />
                        {err('battery_health')}
                    </div>
                    )}
                    {specFields.sim && (
                    <div>
                        <Label optional>SIM type</Label>
                        <select value={form.sim_type} onChange={(e) => set('sim_type', e.target.value)} className={inputClass}>
                            <option value="">Not specified</option>
                            {SIM_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        {err('sim_type')}
                    </div>
                    )}
                </div>
                )}

                {specFields.lock && (
                <div>
                    <Label optional>Network lock</Label>
                    <select value={form.network_lock} onChange={(e) => set('network_lock', e.target.value)} className={inputClass}>
                        <option value="">Not specified</option>
                        {NETWORK_LOCK_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {err('network_lock')}
                </div>
                )}

                <div>
                    <Label optional>Known faults</Label>
                    <textarea
                        rows={3}
                        maxLength={500}
                        value={form.faults}
                        onChange={(e) => set('faults', e.target.value)}
                        placeholder="Cracks, faults or missing parts. Leave empty if none."
                        className={inputClass}
                    />
                    {err('faults')}
                </div>

                <div>
                    <Label optional>Description</Label>
                    <textarea
                        rows={5}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                        placeholder="Condition details, what's included, reason for selling…"
                        className={inputClass}
                    />
                    {err('description')}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Region</Label>
                        <select
                            value={form.listing_city}
                            onChange={(e) => set('listing_city', e.target.value)}
                            className={inputClass}
                        >
                            {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label>Pickup Area</Label>
                        <input
                            list="edit-area-options"
                            value={form.meetup_area}
                            onChange={(e) => set('meetup_area', e.target.value)}
                            placeholder="Pick one or type your own"
                            className={inputClass}
                        />
                        <datalist id="edit-area-options">
                            {areaOptions.map((a) => <option key={a} value={a} />)}
                        </datalist>
                        {err('meetup_area')}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 border border-gray-200 px-4 py-3 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.delivery_available}
                            onChange={(e) => set('delivery_available', e.target.checked)}
                        />
                        Delivery available
                    </label>
                    <label className="flex items-center gap-2 border border-gray-200 px-4 py-3 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.inspection_available}
                            onChange={(e) => set('inspection_available', e.target.checked)}
                        />
                        Inspect before paying
                    </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        className="bg-black text-white px-6 py-3 text-sm font-bold hover:bg-gray-900 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <Link href="/dashboard" className="text-sm font-semibold text-gray-600 underline">
                        Back to dashboard
                    </Link>
                </div>
            </fieldset>
        </form>
    );
        }

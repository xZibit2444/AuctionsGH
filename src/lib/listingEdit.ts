import { z } from 'zod';
import { ITEM_CATEGORIES, getLocationsForRegion } from '@/lib/constants';

const CATEGORY_VALUES = [...ITEM_CATEGORIES, 'Apple'] as [string, ...string[]];

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

export const SIM_TYPE_OPTIONS = [
    { value: 'physical_sim', label: 'Physical SIM' },
    { value: 'dual_sim', label: 'Dual SIM' },
    { value: 'esim', label: 'eSIM only' },
] as const;

/** Which optional spec fields apply to a listing category, so the form
 *  matches what is being listed (no network lock on Home & Garden, etc.). */
export type SpecFieldVisibility = {
    storage: boolean;
    battery: boolean;
    sim: boolean;
    lock: boolean;
};

const FULL_SPEC_CATEGORIES: ReadonlySet<string> = new Set(['Phones & Tablets', 'Apple']);
const STORAGE_BATTERY_CATEGORIES: ReadonlySet<string> = new Set(['Computers & Laptops']);

/** Placeholder examples that match the category being listed, so sellers are
 *  not shown iPhone examples while listing furniture. */
export type CategoryPlaceholders = {
    title: string;
    model: string;
    batteryLabel: string;
};

const CATEGORY_PLACEHOLDERS: Record<string, { title: string; model: string }> = {
    'Phones & Tablets': { title: 'iPhone 14 Pro Max 256GB Deep Purple', model: 'e.g. Apple iPhone 15 Pro, Samsung Galaxy S24…' },
    Apple: { title: 'iPhone 14 Pro Max 256GB Deep Purple', model: 'e.g. Apple iPhone 15 Pro, iPad Air…' },
    Electronics: { title: 'e.g. Samsung 55" Smart TV', model: 'e.g. Samsung, LG, Sony…' },
    'Computers & Laptops': { title: 'e.g. HP Pavilion 15, 16GB RAM', model: 'e.g. HP, Dell, MacBook Air M2…' },
    Vehicles: { title: 'e.g. 2015 Toyota Corolla', model: 'e.g. Toyota Corolla, Honda Civic…' },
    'Home & Garden': { title: 'e.g. 3-seater fabric sofa', model: 'e.g. IKEA, Ashfoam…' },
    'Fashion & Clothing': { title: "e.g. Men's leather jacket, size L", model: 'e.g. Nike, Zara…' },
};

const DEFAULT_PLACEHOLDERS = { title: 'e.g. Item name with key detail', model: 'e.g. Brand or model…' };

export function placeholdersForCategory(category: string | null | undefined): CategoryPlaceholders {
    const specific = (category && CATEGORY_PLACEHOLDERS[category]) || DEFAULT_PLACEHOLDERS;
    return {
        ...specific,
        // Desktops have no battery to report; make clear this is for laptops.
        batteryLabel: category === 'Computers & Laptops' ? 'Laptop battery health (%)' : 'Battery health (%)',
    };
}

export function specFieldsForCategory(category: string | null | undefined): SpecFieldVisibility {
    if (category && FULL_SPEC_CATEGORIES.has(category)) {
        return { storage: true, battery: true, sim: true, lock: true };
    }
    if (category && STORAGE_BATTERY_CATEGORIES.has(category)) {
        return { storage: true, battery: true, sim: false, lock: false };
    }
    return { storage: false, battery: false, sim: false, lock: false };
}

export const NETWORK_LOCK_OPTIONS = [
    { value: 'unlocked', label: 'Factory unlocked' },
    { value: 'locked', label: 'Network locked' },
    { value: 'unknown', label: 'Not sure' },
] as const;

export const updateListingSchema = z.object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
    brand: z.enum(CATEGORY_VALUES),
    model: z.string().trim().max(100).optional().default(''),
    storage_gb: z.coerce.number().positive().optional().nullable(),
    battery_health: z.preprocess(
        emptyToNull,
        z.coerce.number().int('Battery health must be a whole number').min(0, 'Battery health must be 0 to 100').max(100, 'Battery health must be 0 to 100').nullable()
    ).optional(),
    sim_type: z.preprocess(emptyToNull, z.enum(['physical_sim', 'esim', 'dual_sim']).nullable()).optional(),
    network_lock: z.preprocess(emptyToNull, z.enum(['unlocked', 'locked', 'unknown']).nullable()).optional(),
    faults: z.string().trim().max(500, 'Faults cannot exceed 500 characters').optional().nullable(),
    condition: z.enum(['new', 'brand_new', 'like_new', 'good', 'fair', 'poor']),
    price: z.coerce
        .number()
        .positive('Price must be greater than 0')
        .min(1, 'Minimum price is GHS 1')
        .max(999999, 'Maximum price is GHS 999,999')
        .optional(),
    listing_city: z.string().min(1),
    meetup_area: z.string().trim().min(1, 'Please choose or type a pickup area').max(80),
    delivery_available: z.boolean(),
    inspection_available: z.boolean(),
}).superRefine((data, ctx) => {
    // Known areas come from the list. Sellers can also type their own area.
    const known = getLocationsForRegion(data.listing_city) as readonly string[];
    if (!known.includes(data.meetup_area) && data.meetup_area.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meetup_area'], message: 'Please enter a valid area' });
    }
});

export type UpdateListingInput = z.input<typeof updateListingSchema>;

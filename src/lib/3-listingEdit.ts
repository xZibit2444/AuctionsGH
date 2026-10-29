import { z } from 'zod';
import { ITEM_CATEGORIES, getLocationsForRegion } from '@/lib/constants';

const CATEGORY_VALUES = [...ITEM_CATEGORIES, 'Apple'] as [string, ...string[]];

export const updateListingSchema = z.object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
    brand: z.enum(CATEGORY_VALUES),
    model: z.string().trim().max(100).optional().default(''),
    storage_gb: z.coerce.number().positive().optional().nullable(),
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
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

import { z } from 'zod';
import {
    GHANA_PHONE_REGEX,
    ITEM_CATEGORIES,
    GHANA_REGIONS,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
    getLocationsForRegion,
} from './constants';

const AUCTION_BRAND_VALUES = [...ITEM_CATEGORIES, 'Apple'] as const;
const AUCTION_REGION_VALUES = ['Accra', ...GHANA_REGIONS] as const;

// ── Auth Schemas ──

function normalizeGhanaPhoneNumber(value: string) {
    const compact = value.replace(/[\s()-]/g, '');

    if (/^0\d{9}$/.test(compact)) {
        return `+233${compact.slice(1)}`;
    }

    if (/^233\d{9}$/.test(compact)) {
        return `+${compact}`;
    }

    return compact;
}

const ghanaPhoneSchema = z
    .string()
    .min(1, 'Phone number is required')
    .transform(normalizeGhanaPhoneNumber)
    .refine((value) => GHANA_PHONE_REGEX.test(value), 'Please enter a valid Ghana phone number');

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: passwordSchema,
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    full_name: z.string().min(2, 'Please enter your full name'),
    phone_number: ghanaPhoneSchema,
    location: z.string().min(1, 'Please select your region'),
});

// ── Auction Schemas ──

export const createAuctionSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    brand: z.enum(AUCTION_BRAND_VALUES as unknown as [string, ...string[]]),
    model: z.string().max(100).optional().default(''),
    storage_gb: z.coerce.number().positive().optional().or(z.literal(0)),

    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
    starting_price: z.coerce
        .number()
        .positive('Starting price must be greater than 0')
        .min(1, 'Minimum starting price is GHS 1')
        .max(999999, 'Maximum starting price is GHS 999,999'),
    min_increment: z.coerce.number().positive().default(5),
    duration_hours: z.coerce.number().min(0).optional().default(0),
    duration_minutes: z.coerce.number().min(0).max(59).optional().default(0),
    listing_city: z.enum(AUCTION_REGION_VALUES as unknown as [string, ...string[]]),
    meetup_area: z.string().min(1, 'Please select a location'),
    delivery_available: z.boolean().default(true),
    inspection_available: z.boolean().default(true),
    winner_note: z.string().max(500, 'Winner note cannot exceed 500 characters').optional(),
}).superRefine((data, ctx) => {
    const validLocations = getLocationsForRegion(data.listing_city);
    if (!validLocations.includes(data.meetup_area)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['meetup_area'],
            message: `Please select a location in ${data.listing_city}`,
        });
    }
});

// ── Bid Schema ──

export const placeBidSchema = z.object({
    auction_id: z.string().uuid(),
    amount: z.coerce
        .number()
        .positive('Bid must be a positive number')
        .max(999999, 'Maximum bid is GHS 999,999'),
});

// ── Profile Schema ──

export const updateProfileSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(20)
        .regex(/^[a-zA-Z0-9_]+$/)
        .optional(),
    full_name: z.string().min(2).optional(),
    phone_number: z.preprocess(
        (value) => typeof value === 'string' && value !== '' ? normalizeGhanaPhoneNumber(value) : value,
        z
            .string()
            .regex(GHANA_PHONE_REGEX, 'Please enter a valid Ghana phone number')
            .optional()
            .or(z.literal(''))
    ),
    location: z.string().optional(),
});

// ── Image Validation ──

export function validateImageFile(file: File): string | null {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
        return 'Only JPEG, PNG, and WebP images are allowed';
    }
    if (file.size > MAX_IMAGE_SIZE) {
        return 'Image must be smaller than 5 MB';
    }
    return null;
}

// ── Inferred types ──

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

import { z } from 'zod';
import {
    GHANA_PHONE_REGEX,
    PHONE_BRANDS,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
} from './constants';

// ── Auth Schemas ──

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
    phone_number: z
        .string()
        .regex(GHANA_PHONE_REGEX, 'Please enter a valid Ghana phone number (+233XXXXXXXXX)')
        .optional()
        .or(z.literal('')),
    location: z.string().optional(),
});

// ── Auction Schemas ──

export const createAuctionSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    brand: z.enum(PHONE_BRANDS as unknown as [string, ...string[]]),
    model: z.string().min(1, 'Please enter the phone model'),
    storage_gb: z.coerce.number().positive().optional().or(z.literal(0)),

    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
    starting_price: z.coerce
        .number()
        .positive('Starting price must be greater than 0')
        .min(1, 'Minimum starting price is GHS 1')
        .max(999999, 'Maximum starting price is GHS 999,999'),
    min_increment: z.coerce.number().positive().default(5),
    duration_hours: z.coerce.number().min(0),
    duration_minutes: z.coerce.number().min(0).max(59).optional(),
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
    phone_number: z
        .string()
        .regex(GHANA_PHONE_REGEX, 'Please enter a valid Ghana phone number')
        .optional()
        .or(z.literal('')),
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

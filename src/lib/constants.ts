/** Ghana Cedi currency code */
export const CURRENCY = 'GHS';
export const CURRENCY_SYMBOL = '₵';
export const CURRENCY_LOCALE = 'en-GH';

/** Minimum bid increment in GHS */
export const DEFAULT_MIN_INCREMENT = 50.0;

/** Maximum image upload size in bytes (5 MB) */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const;

/** Maximum images per auction */
export const MAX_IMAGES_PER_AUCTION = 6;

/** Supabase Storage bucket for auction images */
export const AUCTION_IMAGES_BUCKET = 'auction-images';

/** Popular phone brands in Ghana */
export const PHONE_BRANDS = [
    'Apple',
    'Samsung',
    'Tecno',
    'Infinix',
    'Xiaomi',
    'Huawei',
    'Nokia',
    'Oppo',
    'Vivo',
    'Realme',
    'Google',
    'OnePlus',
    'Motorola',
    'Other',
] as const;

/** Phone condition labels */
export const CONDITION_LABELS: Record<string, string> = {
    new: 'Brand New (Sealed)',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
};

/** Common storage sizes (GB) */
export const STORAGE_OPTIONS = [16, 32, 64, 128, 256, 512, 1024] as const;

/** Common RAM sizes (GB) */
export const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16] as const;

/** Auction duration presets */
export const AUCTION_DURATIONS = [
    { label: '1 Day', hours: 24 },
    { label: '3 Days', hours: 72 },
    { label: '5 Days', hours: 120 },
    { label: '7 Days', hours: 168 },
] as const;

/** Ghana regions for location selection */
export const GHANA_REGIONS = [
    'Greater Accra',
    'Ashanti',
    'Western',
    'Eastern',
    'Central',
    'Northern',
    'Volta',
    'Upper East',
    'Upper West',
    'Brong Ahafo',
    'Bono East',
    'Ahafo',
    'Savannah',
    'North East',
    'Oti',
    'Western North',
] as const;

/** Ghana phone number regex: +233 followed by 9 digits */
export const GHANA_PHONE_REGEX = /^\+233\d{9}$/;

/** Snipe protection: extend auction by this many minutes if bid arrives near end */
export const SNIPE_PROTECTION_MINUTES = 2;

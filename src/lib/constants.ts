export const CURRENCY_SYMBOL = '₵';

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

/** Item categories (Jiji-inspired) */
export const ITEM_CATEGORIES = [
    'Phones & Tablets',
    'Electronics',
    'Computers & Laptops',
    'Vehicles',
    'Fashion & Clothing',
    'Home & Garden',
    'Sports & Outdoors',
    'Kids & Baby',
    'Health & Beauty',
    'Agriculture',
    'Other',
] as const;

/** @deprecated use ITEM_CATEGORIES - kept only to avoid breaking any external references */
export const PHONE_BRANDS = ITEM_CATEGORIES;

/** Phone condition labels */
export const CONDITION_LABELS: Record<string, string> = {
    new: 'Brand New (Sealed)',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
};

/** Auction duration presets */
export const AUCTION_DURATIONS = [
    { label: '1 Day', hours: 24 },
    { label: '3 Days', hours: 72 },
    { label: '5 Days', hours: 120 },
    { label: '7 Days', hours: 168 },
] as const;

/** Marketplace city scope for listings */
export const LISTING_CITIES = ['Accra'] as const;

/** Common meetup areas in Accra for handover/pickup */
export const ACCRA_MEETUP_AREAS = [
    'Accra Central',
    'Airport Residential',
    'East Legon',
    'Adenta',
    'Madina',
    'Tema',
    'Spintex',
    'Dansoman',
    'Achimota',
    'Kasoa',
    'Osu',
    'Cantonments',
    'Dzorwulu',
    'Lapaz',
    'Ablekuma',
    'Other (Specify in Description)',
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

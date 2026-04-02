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

/** Supabase Storage bucket for profile images */
export const PROFILE_IMAGES_BUCKET = 'profile-images';

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
    'Bono',
    'Bono East',
    'Ahafo',
    'Savannah',
    'North East',
    'Oti',
    'Western North',
] as const;

/** Marketplace city scope for listings. Kept for backwards compatibility. */
export const LISTING_CITIES = ['Accra', ...GHANA_REGIONS] as const;

/** Region-specific meetup areas for handover/pickup */
export const GHANA_LOCATIONS_BY_REGION = {
    'Accra': [
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
    ],
    'Greater Accra': [
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
    ],
    Ashanti: [
        'Kumasi Central',
        'Adum',
        'Asokwa',
        'Bantama',
        'Suame',
        'Tafo',
        'Oforikrom',
        'Ejisu',
        'Bekwai',
        'Obuasi',
        'Konongo',
        'Other (Specify in Description)',
    ],
    Western: [
        'Takoradi',
        'Sekondi',
        'Tarkwa',
        'Axim',
        'Shama',
        'Bogoso',
        'Sefwi Wiawso',
        'Agona Nkwanta',
        'Nzema',
        'Other (Specify in Description)',
    ],
    Eastern: [
        'Koforidua',
        'Nsawam',
        'Akim Oda',
        'Nkawkaw',
        'Suhum',
        'Somanya',
        'Kibi',
        'Akropong',
        'New Abirem',
        'Other (Specify in Description)',
    ],
    Central: [
        'Cape Coast',
        'Elmina',
        'Mankessim',
        'Winneba',
        'Swedru',
        'Apam',
        'Dunkwa-on-Offin',
        'Other (Specify in Description)',
    ],
    Northern: [
        'Tamale',
        'Savelugu',
        'Yendi',
        'Walewale',
        'Damongo',
        'Bole',
        'Other (Specify in Description)',
    ],
    Volta: [
        'Ho',
        'Hohoe',
        'Keta',
        'Aflao',
        'Kpando',
        'Sogakope',
        'Anloga',
        'Other (Specify in Description)',
    ],
    'Upper East': [
        'Bolgatanga',
        'Navrongo',
        'Bawku',
        'Zebilla',
        'Other (Specify in Description)',
    ],
    'Upper West': [
        'Wa',
        'Jirapa',
        'Nadowli',
        'Lawra',
        'Tumu',
        'Other (Specify in Description)',
    ],
    Bono: [
        'Sunyani',
        'Berekum',
        'Goaso',
        'Duayaw Nkwanta',
        'Other (Specify in Description)',
    ],
    'Bono East': [
        'Techiman',
        'Nkoranza',
        'Atebubu',
        'Yeji',
        'Kintampo',
        'Other (Specify in Description)',
    ],
    Ahafo: [
        'Goaso',
        'Kenyasi',
        'Mim',
        'Hwidiem',
        'Other (Specify in Description)',
    ],
    Savannah: [
        'Damongo',
        'Sawla',
        'Buipe',
        'Salaga',
        'Daboya',
        'Other (Specify in Description)',
    ],
    'North East': [
        'Nalerigu',
        'Gambaga',
        'Walewale',
        'Bunkpurugu',
        'Other (Specify in Description)',
    ],
    Oti: [
        'Dambai',
        'Jasikan',
        'Nkwanta',
        'Krachi',
        'Other (Specify in Description)',
    ],
    'Western North': [
        'Sefwi Wiawso',
        'Bibiani',
        'Juaboso',
        'Akontombra',
        'Enchi',
        'Other (Specify in Description)',
    ],
} as const;

/** Backwards-compatible Accra meetup areas list. */
export const ACCRA_MEETUP_AREAS = GHANA_LOCATIONS_BY_REGION.Accra;

export function getLocationsForRegion(region: string) {
    return (
        GHANA_LOCATIONS_BY_REGION[region as keyof typeof GHANA_LOCATIONS_BY_REGION] ??
        GHANA_LOCATIONS_BY_REGION['Greater Accra']
    );
}

/** Ghana phone number regex: +233 followed by 9 digits */
export const GHANA_PHONE_REGEX = /^\+233\d{9}$/;

/** Snipe protection: extend auction by this many minutes if bid arrives near end */
export const SNIPE_PROTECTION_MINUTES = 2;

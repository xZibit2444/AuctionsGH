import type { Database } from './database';

export type Auction = Database['public']['Tables']['auctions']['Row'];
export type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
export type AuctionUpdate = Database['public']['Tables']['auctions']['Update'];
export type AuctionImage = Database['public']['Tables']['auction_images']['Row'];
export type ListingVideo = Database['public']['Tables']['listing_videos']['Row'];

export type AuctionWithImages = Auction & {
    auction_images: AuctionImage[];
};

export type AuctionWithSeller = Auction & {
    profiles: {
        id: string;
        username: string;
        avatar_url: string | null;
        location: string | null;
        is_verified: boolean;
        /** Only present when the listing query includes them (detail page). */
        phone_number?: string | null;
        whatsapp_enabled?: boolean | null;
    };
};

/** Public seller fields shown on listing cards. */
export type SellerPreview = {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    /** Only present when the listing query includes them (homepage pinned card CTA). */
    phone_number?: string | null;
    whatsapp_enabled?: boolean | null;
};

export type AuctionFull = AuctionWithImages & AuctionWithSeller;

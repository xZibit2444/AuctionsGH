import type { Database } from './database';

export type Auction = Database['public']['Tables']['auctions']['Row'];
export type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
export type AuctionUpdate = Database['public']['Tables']['auctions']['Update'];
export type AuctionImage = Database['public']['Tables']['auction_images']['Row'];

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
    };
};

export type AuctionFull = AuctionWithImages & AuctionWithSeller;

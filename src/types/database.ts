/**
 * Auto-generated Supabase database types.
 * In production, regenerate with: npx supabase gen types typescript --local > src/types/database.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type AuctionStatus = 'draft' | 'active' | 'ended' | 'sold' | 'cancelled';
export type PhoneCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type NotificationType = 'outbid' | 'auction_won' | 'auction_ended' | 'new_bid';
export type SellerApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    username: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    phone_number: string | null;
                    location: string | null;
                    is_verified: boolean;
                    is_admin: boolean;
                    is_super_admin: boolean;
                    notification_preferences: {
                        new_bid: boolean;
                        auction_ending: boolean;
                        auction_won: boolean;
                        new_message: boolean;
                        promotions: boolean;
                    } | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    username: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    phone_number?: string | null;
                    location?: string | null;
                    is_verified?: boolean;
                    is_admin?: boolean;
                    is_super_admin?: boolean;
                    notification_preferences?: object | null;
                    fcm_token?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    username?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    phone_number?: string | null;
                    location?: string | null;
                    is_verified?: boolean;
                    is_admin?: boolean;
                    is_super_admin?: boolean;
                    notification_preferences?: object | null;
                    fcm_token?: string | null;
                    updated_at?: string;
                };
            };
            auctions: {
                Row: {
                    id: string;
                    seller_id: string;
                    title: string;
                    description: string | null;
                    brand: string;
                    model: string;
                    storage_gb: number | null;
                    ram_gb: number | null;
                    condition: PhoneCondition;
                    listing_city: string;
                    meetup_area: string;
                    delivery_available: boolean;
                    inspection_available: boolean;
                    starting_price: number;
                    current_price: number;
                    min_increment: number;
                    bid_count: number;
                    status: AuctionStatus;
                    winner_id: string | null;
                    starts_at: string;
                    ends_at: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    seller_id: string;
                    title: string;
                    description?: string | null;
                    brand: string;
                    model: string;
                    storage_gb?: number | null;
                    ram_gb?: number | null;
                    condition: PhoneCondition;
                    listing_city?: string;
                    meetup_area?: string;
                    delivery_available?: boolean;
                    inspection_available?: boolean;
                    starting_price: number;
                    current_price: number;
                    min_increment?: number;
                    bid_count?: number;
                    status?: AuctionStatus;
                    winner_id?: string | null;
                    starts_at?: string;
                    ends_at: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    title?: string;
                    description?: string | null;
                    brand?: string;
                    model?: string;
                    storage_gb?: number | null;
                    ram_gb?: number | null;
                    condition?: PhoneCondition;
                    listing_city?: string;
                    meetup_area?: string;
                    delivery_available?: boolean;
                    inspection_available?: boolean;
                    starting_price?: number;
                    current_price?: number;
                    min_increment?: number;
                    bid_count?: number;
                    status?: AuctionStatus;
                    winner_id?: string | null;
                    ends_at?: string;
                    updated_at?: string;
                };
            };
            auction_images: {
                Row: {
                    id: string;
                    auction_id: string;
                    url: string;
                    position: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    auction_id: string;
                    url: string;
                    position?: number;
                    created_at?: string;
                };
                Update: {
                    url?: string;
                    position?: number;
                };
            };
            auction_winner_notes: {
                Row: {
                    auction_id: string;
                    seller_id: string;
                    note: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    auction_id: string;
                    seller_id: string;
                    note: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    note?: string;
                    updated_at?: string;
                };
            };
            bids: {
                Row: {
                    id: string;
                    auction_id: string;
                    bidder_id: string;
                    amount: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    auction_id: string;
                    bidder_id: string;
                    amount: number;
                    created_at?: string;
                };
                Update: never;
            };
            notifications: {
                Row: {
                    id: string;
                    user_id: string;
                    type: NotificationType;
                    title: string;
                    body: string | null;
                    auction_id: string | null;
                    is_read: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    type: NotificationType;
                    title: string;
                    body?: string | null;
                    auction_id?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
                Update: {
                    is_read?: boolean;
                };
            };
            watchlist: {
                Row: {
                    user_id: string;
                    auction_id: string;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    auction_id: string;
                    created_at?: string;
                };
                Update: never;
            };
            user_reviews: {
                Row: {
                    id: string;
                    order_id: string;
                    reviewer_id: string;
                    reviewee_id: string;
                    rating: number;
                    comment: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    reviewer_id: string;
                    reviewee_id: string;
                    rating: number;
                    comment?: string | null;
                    created_at?: string;
                };
                Update: never;
            };
            seller_applications: {
                Row: {
                    id: string;
                    user_id: string;
                    full_name: string;
                    phone_number: string;
                    location: string;
                    items_to_sell: string;
                    experience: string;
                    id_type: string;
                    id_number: string;
                    status: SellerApplicationStatus;
                    admin_notes: string | null;
                    reviewed_by: string | null;
                    reviewed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    full_name: string;
                    phone_number: string;
                    location: string;
                    items_to_sell: string;
                    experience: string;
                    id_type: string;
                    id_number: string;
                    status?: SellerApplicationStatus;
                    admin_notes?: string | null;
                    reviewed_by?: string | null;
                    reviewed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    status?: SellerApplicationStatus;
                    admin_notes?: string | null;
                    reviewed_by?: string | null;
                    reviewed_at?: string | null;
                    updated_at?: string;
                };
            };
        };
        Functions: {
            place_bid: {
                Args: {
                    p_auction_id: string;
                    p_bidder_id: string;
                    p_amount: number;
                };
                Returns: Json;
            };
            close_expired_auctions: {
                Args: Record<string, never>;
                Returns: void;
            };
        };
    };
}

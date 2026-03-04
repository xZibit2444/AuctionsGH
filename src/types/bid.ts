import type { Database } from './database';

export type Bid = Database['public']['Tables']['bids']['Row'];
export type BidInsert = Database['public']['Tables']['bids']['Insert'];

export type BidWithBidder = Bid & {
    profiles: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
};

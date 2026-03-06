export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'completed';

export interface Delivery {
    id: string;
    auction_id: string;
    order_id: string;
    seller_id: string;
    buyer_id: string;
    /** Only returned by server-side getDeliveryCodeAction — never in public joins */
    delivery_code?: string;
    status: DeliveryStatus;
    delivered_at: string | null;
    created_at: string;
}

/** Delivery row joined on order page (no delivery_code) */
export type DeliveryPublic = Omit<Delivery, 'delivery_code'>;

'use server';

interface CheckoutFormData {
    auctionId: string;
    buyerId: string;
    deliveryMethod: 'pickup' | 'delivery';
    amount: number;
    address?: string;
    phone: string;
    name: string;
}

/**
 * Checkout is retired: deals are arranged directly between buyer and seller
 * (offers, Deal & Chat, WhatsApp). No new orders are created; existing
 * orders stay readable as history on the orders pages.
 */
export async function createOrderAction(data: CheckoutFormData) {
    void data;
    return { success: false, error: 'Checkout is no longer available. Contact the seller from the listing to arrange the deal.' };
}

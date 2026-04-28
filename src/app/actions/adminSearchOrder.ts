'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminOrderSearchResult {
    id: string;
    receiptNumber: string;
    status: string;
    amount: number;
    created_at: string;
    updated_at: string | null;
    fulfillment_type: string | null;
    meetup_location: string | null;
    payment_method: string | null;
    cancellation_reason: string | null;
    auction: { id: string; title: string } | null;
    buyer: { id: string; full_name: string | null; phone_number: string | null; email: string | null } | null;
    seller: { id: string; full_name: string | null; phone_number: string | null; email: string | null } | null;
    delivery: {
        id: string;
        status: string;
        delivery_code: string | null;
        delivered_at: string | null;
    } | null;
    transcript: {
        id: string;
        senderName: string;
        sentAtLabel: string;
        body: string;
    }[];
}

export async function adminSearchOrderAction(
    query: string
): Promise<{ result: AdminOrderSearchResult | null; error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { result: null, error: 'Unauthenticated' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };

    if (!profile?.is_super_admin) return { result: null, error: 'Access denied' };

    const admin = createAdminClient();
    const trimmed = query.trim().toLowerCase();

    const { data: orders, error: ordersError } = await admin
        .from('orders')
        .select(`
            id, status, amount, created_at, updated_at,
            fulfillment_type, meetup_location, payment_method, cancellation_reason,
            buyer_id, seller_id,
            auction:auctions ( id, title ),
            buyer:profiles!orders_buyer_id_fkey ( id, full_name, phone_number ),
            seller:profiles!orders_seller_id_fkey ( id, full_name, phone_number ),
            deliveries!deliveries_order_id_fkey ( id, status, delivery_code, delivered_at )
        `) as any;

    if (ordersError) return { result: null, error: 'Database error' };

    const match = (orders as any[]).find((o: any) =>
        o.id.toLowerCase() === trimmed ||
        o.id.split('-')[0].toLowerCase() === trimmed
    );

    if (!match) return { result: null, error: 'No order found with that number' };

    const deliveries = Array.isArray(match.deliveries) ? match.deliveries : match.deliveries ? [match.deliveries] : [];
    const delivery = deliveries.sort((a: any, b: any) => {
        const priority: Record<string, number> = { completed: 3, delivered: 2, sent: 1, pending: 0 };
        return (priority[b.status] ?? -1) - (priority[a.status] ?? -1);
    })[0] ?? null;

    const { data: messages } = await admin
        .from('order_messages')
        .select('id, sender_id, body, created_at')
        .eq('order_id', match.id)
        .order('created_at', { ascending: true }) as any;

    const [buyerAuth, sellerAuth] = await Promise.all([
        admin.auth.admin.getUserById(match.buyer_id),
        admin.auth.admin.getUserById(match.seller_id),
    ]);

    const buyerName = match.buyer?.full_name || 'Buyer';
    const sellerName = match.seller?.full_name || 'Seller';

    const transcript = ((messages ?? []) as any[]).map((msg: any) => ({
        id: msg.id,
        senderName: msg.sender_id === match.buyer_id ? buyerName : sellerName,
        sentAtLabel: new Date(msg.created_at).toLocaleString('en-GH', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }),
        body: msg.body,
    }));

    return {
        result: {
            id: match.id,
            receiptNumber: match.id.split('-')[0].toUpperCase(),
            status: match.status,
            amount: match.amount,
            created_at: match.created_at,
            updated_at: match.updated_at,
            fulfillment_type: match.fulfillment_type,
            meetup_location: match.meetup_location,
            payment_method: match.payment_method,
            cancellation_reason: match.cancellation_reason,
            auction: match.auction,
            buyer: {
                id: match.buyer?.id ?? match.buyer_id,
                full_name: match.buyer?.full_name ?? null,
                phone_number: match.buyer?.phone_number ?? null,
                email: buyerAuth.data.user?.email ?? null,
            },
            seller: {
                id: match.seller?.id ?? match.seller_id,
                full_name: match.seller?.full_name ?? null,
                phone_number: match.seller?.phone_number ?? null,
                email: sellerAuth.data.user?.email ?? null,
            },
            delivery,
            transcript,
        },
    };
}

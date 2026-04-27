import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils';
import { sendOrderCompletedSummaryEmail, sendReceiptEmail } from '@/lib/email/sender';

type OrderCompletionRow = {
    id: string;
    amount: number;
    created_at: string;
    updated_at: string;
    fulfillment_type: string | null;
    meetup_location: string | null;
    buyer_id: string;
    seller_id: string;
    auction: {
        title: string;
        auction_winner_notes?: { note: string }[] | { note: string } | null;
    } | null;
    buyer: {
        full_name?: string | null;
        username?: string | null;
    } | null;
    seller: {
        full_name?: string | null;
        username?: string | null;
    } | null;
};

type TranscriptRow = {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
};

function getDisplayName(profile: { full_name?: string | null; username?: string | null } | null, fallback: string) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

function formatOrderNumber(orderId: string) {
    return orderId.split('-')[0]?.toUpperCase() || orderId.toUpperCase();
}

function formatDateLabel(value: string) {
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getFulfillmentLabel(fulfillmentType: string | null) {
    if (fulfillmentType === 'meet_and_inspect') return 'Pickup / Meet & Inspect';
    if (fulfillmentType === 'delivery') return 'Courier Delivery';
    return 'Not specified';
}

export async function sendOrderCompletionEmails(orderId: string) {
    const supabaseAdmin = createAdminClient();

    const [{ data: order, error: orderError }, { data: transcript, error: transcriptError }] = await Promise.all([
        supabaseAdmin
            .from('orders')
            .select(`
                id,
                amount,
                created_at,
                updated_at,
                fulfillment_type,
                meetup_location,
                buyer_id,
                seller_id,
                auction:auctions (
                    title,
                    auction_winner_notes(note)
                ),
                buyer:profiles!orders_buyer_id_fkey (
                    full_name,
                    username
                ),
                seller:profiles!orders_seller_id_fkey (
                    full_name,
                    username
                )
            `)
            .eq('id', orderId)
            .single(),
        supabaseAdmin
            .from('order_messages')
            .select('id, sender_id, body, created_at')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true }),
    ]);

    if (orderError || !order) {
        console.error('Failed to load order for completion emails:', orderError);
        return;
    }

    if (transcriptError) {
        console.error('Failed to load order transcript for completion emails:', transcriptError);
        return;
    }

    const orderData = order as unknown as OrderCompletionRow;
    const transcriptRows = (transcript ?? []) as TranscriptRow[];

    const buyerName = getDisplayName(orderData.buyer, 'Buyer');
    const sellerName = getDisplayName(orderData.seller, 'Seller');
    const orderNumber = formatOrderNumber(orderData.id);
    const sellerNoteRaw = orderData.auction?.auction_winner_notes;
    const sellerNote = Array.isArray(sellerNoteRaw) ? sellerNoteRaw[0]?.note : sellerNoteRaw?.note;
    const transcriptPayload = transcriptRows.map((message) => ({
        id: message.id,
        senderName: message.sender_id === orderData.buyer_id ? buyerName : sellerName,
        sentAtLabel: formatDateLabel(message.created_at),
        body: message.body,
    }));

    const [buyerAuthResult, sellerAuthResult] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(orderData.buyer_id),
        supabaseAdmin.auth.admin.getUserById(orderData.seller_id),
    ]);

    const sharedPayload = {
        auctionTitle: orderData.auction?.title ?? 'Order item',
        orderNumber,
        amountLabel: formatCurrency(orderData.amount),
        completionDateLabel: formatDateLabel(orderData.updated_at),
        placedDateLabel: formatDateLabel(orderData.created_at),
        fulfillmentLabel: getFulfillmentLabel(orderData.fulfillment_type),
        meetupLocation: orderData.meetup_location?.trim() || 'Not specified',
        orderUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/orders/${orderData.id}`,
        sellerNote: sellerNote?.trim() || null,
        transcript: transcriptPayload,
    };

    const receiptBase = {
        receiptNumber: orderNumber,
        auctionTitle: orderData.auction?.title ?? 'Order item',
        issuedDate: formatDateLabel(orderData.updated_at),
        amountLabel: formatCurrency(orderData.amount),
        fulfillmentLabel: getFulfillmentLabel(orderData.fulfillment_type),
        meetupLocation: orderData.meetup_location?.trim() || 'Not specified',
        paymentMethod: 'Cash on Delivery (COD)',
    };

    if (buyerAuthResult.data.user?.email) {
        const buyerEmail = buyerAuthResult.data.user.email;

        void sendReceiptEmail(buyerEmail, {
            ...receiptBase,
            role: 'buyer',
            recipientName: buyerName,
            recipientEmail: buyerEmail,
            otherPartyName: sellerName,
            transcript: transcriptPayload,
        });

        const buyerEmailResult = await sendOrderCompletedSummaryEmail(
            buyerEmail,
            {
                ...sharedPayload,
                recipientName: buyerName,
                otherPartyLabel: sellerName,
            }
        );

        if (!buyerEmailResult.success) {
            console.error('Failed to send buyer completion summary email:', buyerEmailResult.error);
        }
    }

    if (sellerAuthResult.data.user?.email) {
        const sellerEmail = sellerAuthResult.data.user.email;

        void sendReceiptEmail(sellerEmail, {
            ...receiptBase,
            role: 'seller',
            recipientName: sellerName,
            recipientEmail: sellerEmail,
            otherPartyName: buyerName,
            transcript: transcriptPayload,
        });

        const sellerEmailResult = await sendOrderCompletedSummaryEmail(
            sellerEmail,
            {
                ...sharedPayload,
                recipientName: sellerName,
                otherPartyLabel: buyerName,
            }
        );

        if (!sellerEmailResult.success) {
            console.error('Failed to send seller completion summary email:', sellerEmailResult.error);
        }
    }
}

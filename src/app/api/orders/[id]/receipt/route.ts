import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React, { type ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import OrderReceiptPDF from '@/lib/pdf/OrderReceiptPDF';

const supabaseAdmin = createAdminClient();

function getDisplayName(profile: { full_name?: string | null; username?: string | null } | null, fallback: string) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

function formatOrderNumber(orderId: string) {
    return orderId.split('-')[0]?.toUpperCase() || orderId.toUpperCase();
}

function formatDateLabel(value: string) {
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getFulfillmentLabel(type: string | null) {
    if (type === 'meet_and_inspect') return 'Pickup / Meet & Inspect';
    if (type === 'delivery') return 'Courier Delivery';
    return 'Not specified';
}

async function resolveUser(req: NextRequest) {
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (bearer) {
        const { data, error } = await supabaseAdmin.auth.getUser(bearer);
        if (!error && data.user) return data.user;
    }
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: orderId } = await params;

    const user = await resolveUser(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const [{ data: order, error: orderError }, { data: messages, error: msgError }] = await Promise.all([
        supabaseAdmin
            .from('orders')
            .select(`
                id, amount, status, cancellation_reason,
                created_at, updated_at, fulfillment_type, meetup_location,
                buyer_id, seller_id,
                auction:auctions ( title ),
                buyer:profiles!orders_buyer_id_fkey ( full_name, username ),
                seller:profiles!orders_seller_id_fkey ( full_name, username )
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
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const o = order as any;

    if (o.buyer_id !== user.id && o.seller_id !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const isBuyer = o.buyer_id === user.id;
    const buyerName = getDisplayName(o.buyer, 'Buyer');
    const sellerName = getDisplayName(o.seller, 'Seller');
    const receiptNumber = formatOrderNumber(o.id);

    const [buyerAuth, sellerAuth] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(o.buyer_id),
        supabaseAdmin.auth.admin.getUserById(o.seller_id),
    ]);

    const recipientEmail = isBuyer
        ? (buyerAuth.data.user?.email ?? '')
        : (sellerAuth.data.user?.email ?? '');

    const transcriptRows = ((messages ?? []) as any[]).map((msg) => ({
        id: msg.id,
        senderName: msg.sender_id === o.buyer_id ? buyerName : sellerName,
        sentAtLabel: formatDateLabel(msg.created_at),
        body: msg.body,
    }));

    const pdfBuffer = await renderToBuffer(
        React.createElement(OrderReceiptPDF, {
            data: {
                role: isBuyer ? 'buyer' : 'seller',
                receiptNumber,
                issuedDate: formatDateLabel(o.updated_at),
                recipientName: isBuyer ? buyerName : sellerName,
                recipientEmail,
                otherPartyName: isBuyer ? sellerName : buyerName,
                auctionTitle: o.auction?.title ?? 'Order item',
                amountLabel: formatCurrency(o.amount).replace('₵', 'GHC '),
                fulfillmentLabel: getFulfillmentLabel(o.fulfillment_type),
                meetupLocation: o.meetup_location?.trim() || 'Not specified',
                paymentMethod: 'Cash on Delivery (COD)',
                cancellationReason: o.cancellation_reason ?? null,
                status: o.status,
                transcript: transcriptRows,
            },
        }) as ReactElement<DocumentProps>
    );

    const filename = `AuctionsGH-Receipt-${receiptNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.byteLength.toString(),
        },
    });
}

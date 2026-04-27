import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';

Font.register({
    family: 'Helvetica',
    fonts: [],
});

export interface OrderReceiptData {
    role: 'buyer' | 'seller';
    receiptNumber: string;
    issuedDate: string;
    recipientName: string;
    recipientEmail: string;
    otherPartyName: string;
    auctionTitle: string;
    amountLabel: string;
    fulfillmentLabel: string;
    meetupLocation: string;
    paymentMethod: string;
    cancellationReason?: string | null;
    status: string;
    transcript: { id: string; senderName: string; sentAtLabel: string; body: string }[];
}

const s = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#111827',
        backgroundColor: '#ffffff',
        paddingTop: 48,
        paddingBottom: 56,
        paddingHorizontal: 52,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    brandName: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: -0.5,
        color: '#000',
    },
    receiptType: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 1.2,
        color: '#000',
        textTransform: 'uppercase',
        marginTop: 4,
    },
    rule: {
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        marginBottom: 16,
        marginTop: 8,
    },
    thinRule: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        marginVertical: 14,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    metaBlock: {
        flexDirection: 'column',
    },
    metaLabel: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 1,
        color: '#9ca3af',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
    },
    statusCompleted: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#059669',
        letterSpacing: 0.5,
    },
    statusCancelled: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#dc2626',
        letterSpacing: 0.5,
    },
    partiesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    partyBox: {
        width: '47%',
    },
    partyRoleLabel: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 1,
        color: '#9ca3af',
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    partyName: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
        marginBottom: 1,
    },
    partyEmail: {
        fontSize: 9,
        color: '#6b7280',
    },
    sectionHeading: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 1,
        color: '#111827',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        borderTopWidth: 0.5,
        borderTopColor: '#e5e7eb',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginBottom: 6,
    },
    tableHeaderText: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.8,
        color: '#6b7280',
        textTransform: 'uppercase',
    },
    tableItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 4,
    },
    tableItemTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
        marginBottom: 2,
    },
    tableItemSub: {
        fontSize: 8,
        color: '#9ca3af',
    },
    tableItemAmount: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingTop: 6,
    },
    totalLabel: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: '#111827',
    },
    totalAmount: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#000',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    detailLabel: {
        width: 100,
        fontSize: 8,
        color: '#9ca3af',
        fontFamily: 'Helvetica-Bold',
    },
    detailValue: {
        flex: 1,
        fontSize: 9,
        color: '#374151',
    },
    msgBlock: {
        borderTopWidth: 0.5,
        borderTopColor: '#f3f4f6',
        paddingTop: 8,
        marginTop: 8,
    },
    msgMeta: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#9ca3af',
        marginBottom: 3,
    },
    msgBody: {
        fontSize: 9,
        color: '#374151',
        lineHeight: 1.5,
    },
    footer: {
        marginTop: 24,
        paddingTop: 10,
        borderTopWidth: 0.5,
        borderTopColor: '#e5e7eb',
    },
    footerText: {
        fontSize: 8,
        color: '#6b7280',
        lineHeight: 1.5,
        marginBottom: 4,
    },
    footerMuted: {
        fontSize: 7,
        color: '#d1d5db',
    },
    cancellationBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 0.5,
        borderColor: '#fecaca',
        padding: 10,
        marginBottom: 4,
    },
    cancellationLabel: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.8,
        color: '#dc2626',
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    cancellationText: {
        fontSize: 9,
        color: '#7f1d1d',
    },
});

export default function OrderReceiptPDF({ data }: { data: OrderReceiptData }) {
    const isBuyer = data.role === 'buyer';
    const isCancelled = data.status.startsWith('cancelled');
    const receiptTitle = isCancelled
        ? 'Cancellation Notice'
        : isBuyer
            ? 'Purchase Receipt'
            : 'Sale Receipt';

    return (
        <Document
            title={`${receiptTitle} #${data.receiptNumber}`}
            author="AuctionsGH"
            subject={data.auctionTitle}
        >
            <Page size="A4" style={s.page}>

                {/* Header */}
                <View style={s.header}>
                    <Text style={s.brandName}>AuctionsGH</Text>
                    <Text style={s.receiptType}>{receiptTitle}</Text>
                </View>
                <View style={s.rule} />

                {/* Meta */}
                <View style={s.metaRow}>
                    <View style={s.metaBlock}>
                        <Text style={s.metaLabel}>Receipt No.</Text>
                        <Text style={s.metaValue}>#{data.receiptNumber}</Text>
                    </View>
                    <View style={s.metaBlock}>
                        <Text style={s.metaLabel}>Date Issued</Text>
                        <Text style={s.metaValue}>{data.issuedDate}</Text>
                    </View>
                    <View style={s.metaBlock}>
                        <Text style={s.metaLabel}>Status</Text>
                        <Text style={isCancelled ? s.statusCancelled : s.statusCompleted}>
                            {isCancelled ? 'CANCELLED' : 'COMPLETED'}
                        </Text>
                    </View>
                    <View style={s.metaBlock}>
                        <Text style={s.metaLabel}>Payment</Text>
                        <Text style={s.metaValue}>{data.paymentMethod}</Text>
                    </View>
                </View>

                <View style={s.thinRule} />

                {/* Parties */}
                <View style={s.partiesRow}>
                    <View style={s.partyBox}>
                        <Text style={s.partyRoleLabel}>{isBuyer ? 'Sold to (Buyer)' : 'Sold by (Seller)'}</Text>
                        <Text style={s.partyName}>{data.recipientName}</Text>
                        <Text style={s.partyEmail}>{data.recipientEmail}</Text>
                    </View>
                    <View style={s.partyBox}>
                        <Text style={s.partyRoleLabel}>{isBuyer ? 'Sold by (Seller)' : 'Sold to (Buyer)'}</Text>
                        <Text style={s.partyName}>{data.otherPartyName}</Text>
                        <Text style={s.partyEmail}>via AuctionsGH</Text>
                    </View>
                </View>

                <View style={s.thinRule} />

                {/* Item table */}
                <View style={s.tableHeaderRow}>
                    <Text style={s.tableHeaderText}>Description</Text>
                    <Text style={s.tableHeaderText}>Amount</Text>
                </View>
                <View style={s.tableItemRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={s.tableItemTitle}>{data.auctionTitle}</Text>
                        <Text style={s.tableItemSub}>Auction item  {data.fulfillmentLabel}</Text>
                    </View>
                    <Text style={s.tableItemAmount}>{data.amountLabel}</Text>
                </View>

                <View style={s.thinRule} />

                <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalAmount}>{data.amountLabel}</Text>
                </View>

                <View style={s.thinRule} />

                {/* Handover details */}
                <Text style={s.sectionHeading}>Handover Details</Text>
                <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Method</Text>
                    <Text style={s.detailValue}>{data.fulfillmentLabel}</Text>
                </View>
                <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Location</Text>
                    <Text style={s.detailValue}>{data.meetupLocation}</Text>
                </View>

                {/* Cancellation reason */}
                {isCancelled && data.cancellationReason && (
                    <>
                        <View style={s.thinRule} />
                        <View style={s.cancellationBox}>
                            <Text style={s.cancellationLabel}>Cancellation Reason</Text>
                            <Text style={s.cancellationText}>{data.cancellationReason}</Text>
                        </View>
                    </>
                )}

                <View style={s.thinRule} />

                {/* Chat transcript */}
                <Text style={s.sectionHeading}>Chat Transcript</Text>
                {data.transcript.length === 0 ? (
                    <Text style={s.detailValue}>No messages were exchanged for this order.</Text>
                ) : (
                    data.transcript.map((msg) => (
                        <View key={msg.id} style={s.msgBlock}>
                            <Text style={s.msgMeta}>{msg.senderName}  {msg.sentAtLabel}</Text>
                            <Text style={s.msgBody}>{msg.body}</Text>
                        </View>
                    ))
                )}

                {/* Footer */}
                <View style={s.footer}>
                    <Text style={s.footerText}>
                        This is an official document issued by AuctionsGH confirming the above transaction. Please retain for your records.
                    </Text>
                    <Text style={s.footerMuted}>
                        AuctionsGH  auctionsgh.com  This document was auto-generated and is valid without a signature.
                    </Text>
                </View>

            </Page>
        </Document>
    );
}

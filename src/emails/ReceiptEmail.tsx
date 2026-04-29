import {
    Body,
    Container,
    Head,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Hr,
    Row,
    Column,
} from '@react-email/components';
import * as React from 'react';

export interface ReceiptTranscriptMessage {
    id: string;
    senderName: string;
    sentAtLabel: string;
    body: string;
}

export interface ReceiptEmailProps {
    role: 'buyer' | 'seller';
    recipientName: string;
    recipientEmail: string;
    otherPartyName: string;
    auctionTitle: string;
    receiptNumber: string;
    issuedDate: string;
    amountLabel: string;
    fulfillmentLabel: string;
    meetupLocation: string;
    paymentMethod: string;
    transcript?: ReceiptTranscriptMessage[];
    siteUrl?: string;
}

export default function ReceiptEmail({
    role,
    recipientName,
    recipientEmail,
    otherPartyName,
    auctionTitle,
    receiptNumber,
    issuedDate,
    amountLabel,
    fulfillmentLabel,
    meetupLocation,
    paymentMethod,
    transcript = [],
    siteUrl = 'https://auctionsgh.com',
}: ReceiptEmailProps) {
    const isBuyer = role === 'buyer';
    const title = isBuyer ? 'Purchase Receipt' : 'Sale Receipt';
    const preview = `${title} — ${auctionTitle} — ${amountLabel}`;

    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={wrapper}>

                    {/* Header */}
                    <Section style={header}>
                        <Row>
                            <Column>
                                <Img
                                    src={`${siteUrl}/logo.png`}
                                    alt="AuctionsGH"
                                    width="130"
                                    height="42"
                                    style={{ display: 'block' }}
                                />
                            </Column>
                            <Column align="right">
                                <Text style={receiptBadge}>{isBuyer ? 'PURCHASE RECEIPT' : 'SALE RECEIPT'}</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={headerRule} />

                    {/* Receipt meta */}
                    <Section style={metaRow}>
                        <Row>
                            <Column>
                                <Text style={metaLabel}>Receipt No.</Text>
                                <Text style={metaValue}>#{receiptNumber}</Text>
                            </Column>
                            <Column align="right">
                                <Text style={metaLabel}>Date Issued</Text>
                                <Text style={metaValue}>{issuedDate}</Text>
                            </Column>
                        </Row>
                        <Row>
                            <Column>
                                <Text style={metaLabel}>Status</Text>
                                <Text style={statusBadge}>✓ COMPLETED</Text>
                            </Column>
                            <Column align="right">
                                <Text style={metaLabel}>Payment</Text>
                                <Text style={metaValue}>{paymentMethod}</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={divider} />

                    {/* Parties */}
                    <Section style={partiesSection}>
                        <Row>
                            <Column style={partyCol}>
                                <Text style={partyLabel}>{isBuyer ? 'SOLD TO (BUYER)' : 'SOLD BY (SELLER)'}</Text>
                                <Text style={partyName}>{recipientName}</Text>
                                <Text style={partyEmail}>{recipientEmail}</Text>
                            </Column>
                            <Column style={{ width: '40px' }} />
                            <Column style={partyCol}>
                                <Text style={partyLabel}>{isBuyer ? 'SOLD BY (SELLER)' : 'SOLD TO (BUYER)'}</Text>
                                <Text style={partyName}>{otherPartyName}</Text>
                                <Text style={partyEmailMuted}>via AuctionsGH</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={divider} />

                    {/* Item table */}
                    <Section style={tableSection}>
                        <Row style={tableHeader}>
                            <Column style={{ width: '60%' }}>
                                <Text style={tableHeaderText}>Description</Text>
                            </Column>
                            <Column align="right">
                                <Text style={tableHeaderText}>Amount</Text>
                            </Column>
                        </Row>
                        <Row style={tableRow}>
                            <Column style={{ width: '60%' }}>
                                <Text style={tableItemText}>{auctionTitle}</Text>
                                <Text style={tableItemSub}>Auction item · {fulfillmentLabel}</Text>
                            </Column>
                            <Column align="right">
                                <Text style={tableItemAmount}>{amountLabel}</Text>
                            </Column>
                        </Row>
                        <Hr style={divider} />
                        <Row>
                            <Column>
                                <Text style={totalLabel}>TOTAL</Text>
                            </Column>
                            <Column align="right">
                                <Text style={totalAmount}>{amountLabel}</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={divider} />

                    {/* Delivery details */}
                    <Section style={detailsSection}>
                        <Text style={detailsHeading}>Handover Details</Text>
                        <Row>
                            <Column style={detailLabelCol}>
                                <Text style={detailLabel}>Method</Text>
                            </Column>
                            <Column>
                                <Text style={detailValue}>{fulfillmentLabel}</Text>
                            </Column>
                        </Row>
                        <Row>
                            <Column style={detailLabelCol}>
                                <Text style={detailLabel}>Location</Text>
                            </Column>
                            <Column>
                                <Text style={detailValue}>{meetupLocation}</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={divider} />

                    {/* Chat transcript */}
                    <Section style={detailsSection}>
                        <Text style={detailsHeading}>Chat Transcript</Text>
                        {transcript.length === 0 ? (
                            <Text style={detailLabel}>No messages were exchanged for this order.</Text>
                        ) : (
                            transcript.map((msg) => (
                                <Section key={msg.id} style={transcriptMsg}>
                                    <Text style={transcriptMeta}>{msg.senderName} &bull; {msg.sentAtLabel}</Text>
                                    <Text style={transcriptBody}>{msg.body}</Text>
                                </Section>
                            ))
                        )}
                    </Section>

                    <Hr style={divider} />

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This is an official receipt issued by AuctionsGH confirming the above transaction has been completed.
                            Please retain this document for your records.
                        </Text>
                        <Text style={footerMuted}>
                            AuctionsGH · {siteUrl} · This receipt was auto-generated and is valid without a signature.
                        </Text>
                    </Section>

                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f4f4f4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const wrapper = {
    maxWidth: '620px',
    margin: '32px auto',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e2e2',
    padding: '40px 40px 32px',
};

const header = {
    marginBottom: '4px',
};

const headerRule = {
    borderColor: '#000',
    borderWidth: '2px',
    margin: '16px 0 20px',
};

const receiptBadge = {
    fontSize: '13px',
    fontWeight: '900',
    letterSpacing: '0.1em',
    color: '#000',
    margin: 0,
    paddingTop: '10px',
};

const metaRow = {
    marginBottom: '4px',
};

const metaLabel = {
    color: '#9ca3af',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: '12px 0 2px',
};

const metaValue = {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '700',
    margin: 0,
};

const statusBadge = {
    color: '#059669',
    fontSize: '12px',
    fontWeight: '900',
    letterSpacing: '0.05em',
    margin: 0,
};

const divider = {
    borderColor: '#e5e7eb',
    borderWidth: '1px',
    margin: '20px 0',
};

const partiesSection = {
    marginBottom: '4px',
};

const partyCol = {
    verticalAlign: 'top' as const,
};

const partyLabel = {
    color: '#9ca3af',
    fontSize: '9px',
    fontWeight: '900',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    margin: '0 0 4px',
};

const partyName = {
    color: '#111827',
    fontSize: '15px',
    fontWeight: '800',
    margin: '0 0 2px',
};

const partyEmail = {
    color: '#6b7280',
    fontSize: '12px',
    margin: 0,
};

const partyEmailMuted = {
    color: '#9ca3af',
    fontSize: '12px',
    margin: 0,
};

const tableSection = {
    marginBottom: '4px',
};

const tableHeader = {
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    padding: '8px 0',
};

const tableHeaderText = {
    color: '#6b7280',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: '8px 0',
};

const tableRow = {
    padding: '12px 0',
};

const tableItemText = {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '700',
    margin: '12px 0 2px',
};

const tableItemSub = {
    color: '#9ca3af',
    fontSize: '11px',
    margin: '0 0 12px',
};

const tableItemAmount = {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '700',
    margin: '12px 0',
};

const totalLabel = {
    color: '#111827',
    fontSize: '12px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: 0,
};

const totalAmount = {
    color: '#000',
    fontSize: '22px',
    fontWeight: '900',
    margin: 0,
};

const detailsSection = {
    marginBottom: '4px',
};

const detailsHeading = {
    color: '#111827',
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: '0 0 12px',
};

const detailLabelCol = {
    width: '120px',
    verticalAlign: 'top' as const,
};

const detailLabel = {
    color: '#9ca3af',
    fontSize: '11px',
    fontWeight: '700',
    margin: '0 0 8px',
};

const detailValue = {
    color: '#374151',
    fontSize: '13px',
    margin: '0 0 8px',
};

const footerSection = {
    marginTop: '8px',
};

const footerText = {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '1.6',
    margin: '0 0 12px',
};

const footerMuted = {
    color: '#d1d5db',
    fontSize: '10px',
    margin: 0,
};

const transcriptMsg = {
    borderTop: '1px solid #f3f4f6',
    paddingTop: '12px',
    marginTop: '12px',
};

const transcriptMeta = {
    color: '#9ca3af',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    margin: '0 0 4px',
};

const transcriptBody = {
    color: '#374151',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
};

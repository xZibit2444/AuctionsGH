import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';
import EmailLogo from './EmailLogo';

type TranscriptMessage = {
    id: string;
    senderName: string;
    sentAtLabel: string;
    body: string;
};

interface OrderCompletedSummaryEmailProps {
    recipientName: string;
    auctionTitle: string;
    orderNumber: string;
    amountLabel: string;
    completionDateLabel: string;
    placedDateLabel: string;
    fulfillmentLabel: string;
    meetupLocation: string;
    otherPartyLabel: string;
    orderUrl: string;
    sellerNote?: string | null;
    transcript: TranscriptMessage[];
}

export default function OrderCompletedSummaryEmail({
    recipientName,
    auctionTitle,
    orderNumber,
    amountLabel,
    completionDateLabel,
    placedDateLabel,
    fulfillmentLabel,
    meetupLocation,
    otherPartyLabel,
    orderUrl,
    sellerNote,
    transcript,
}: OrderCompletedSummaryEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>{`Order #${orderNumber} is complete`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <EmailLogo />
                    <Heading style={heading}>Your completed order copy</Heading>
                    <Text style={text}>Hi {recipientName},</Text>
                    <Text style={text}>
                        Your order for <strong>{auctionTitle}</strong> is complete. A copy of the order details and full chat transcript is below for your records.
                    </Text>

                    <Section style={summaryCard}>
                        <Text style={eyebrow}>Order Number</Text>
                        <Text style={orderNumberText}>#{orderNumber}</Text>
                        <Text style={detailLine}><strong>Amount:</strong> {amountLabel}</Text>
                        <Text style={detailLine}><strong>Placed:</strong> {placedDateLabel}</Text>
                        <Text style={detailLine}><strong>Completed:</strong> {completionDateLabel}</Text>
                        <Text style={detailLine}><strong>Fulfillment:</strong> {fulfillmentLabel}</Text>
                        <Text style={detailLine}><strong>Meetup / delivery:</strong> {meetupLocation}</Text>
                        <Text style={detailLine}><strong>Counterparty:</strong> {otherPartyLabel}</Text>
                    </Section>

                    {sellerNote ? (
                        <Section style={sectionCard}>
                            <Text style={sectionTitle}>Seller note</Text>
                            <Text style={messageText}>{sellerNote}</Text>
                        </Section>
                    ) : null}

                    <Section style={sectionCard}>
                        <Text style={sectionTitle}>Chat transcript</Text>
                        {transcript.length > 0 ? transcript.map((message) => (
                            <Section key={message.id} style={messageCard}>
                                <Text style={messageMeta}>{message.senderName} • {message.sentAtLabel}</Text>
                                <Text style={messageText}>{message.body}</Text>
                            </Section>
                        )) : (
                            <Text style={text}>No chat messages were sent for this order.</Text>
                        )}
                    </Section>

                    <Section style={buttonRow}>
                        <Link href={orderUrl} style={button}>
                            View Order
                        </Link>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 20px',
    marginBottom: '64px',
    border: '1px solid #f0f0f0',
    borderRadius: '5px',
    maxWidth: '560px',
};

const heading = {
    color: '#111',
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 20px',
};

const text = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 16px',
};

const summaryCard = {
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    padding: '20px',
    margin: '28px 0',
};

const eyebrow = {
    margin: '0 0 4px',
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
};

const orderNumberText = {
    margin: '0 0 16px',
    color: '#111827',
    fontSize: '24px',
    fontWeight: '800',
};

const detailLine = {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 8px',
};

const sectionCard = {
    border: '1px solid #e5e7eb',
    padding: '20px',
    margin: '0 0 24px',
};

const sectionTitle = {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    margin: '0 0 16px',
};

const messageCard = {
    borderTop: '1px solid #f3f4f6',
    paddingTop: '14px',
    marginTop: '14px',
};

const messageMeta = {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '18px',
    margin: '0 0 6px',
    fontWeight: '700',
};

const messageText = {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '22px',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
};

const buttonRow = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '8px',
};

const button = {
    backgroundColor: '#000000',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 24px',
};

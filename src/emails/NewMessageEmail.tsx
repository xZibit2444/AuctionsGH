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

interface NewMessageEmailProps {
    recipientName: string;
    senderName: string;
    auctionTitle: string;
    messagePreview: string;
    chatUrl: string;
}

export default function NewMessageEmail({
    recipientName,
    senderName,
    auctionTitle,
    messagePreview,
    chatUrl,
}: NewMessageEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>New message from {senderName} about {auctionTitle}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>You have a new message</Heading>
                    <Text style={text}>Hi {recipientName},</Text>
                    <Text style={text}>
                        <strong>{senderName}</strong> sent you a message about{' '}
                        <strong>{auctionTitle}</strong>:
                    </Text>
                    <Section style={quoteBox}>
                        <Text style={quoteText}>{messagePreview}</Text>
                    </Section>
                    <Section style={buttonRow}>
                        <Link href={chatUrl} style={button}>
                            Reply on AuctionsGH
                        </Link>
                    </Section>
                    <Text style={footer}>
                        You are receiving this email because someone messaged you on AuctionsGH.
                        You can turn off message notifications in Settings &gt; Notifications.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const logo = {
    fontSize: '24px',
    fontWeight: '900',
    letterSpacing: '-1px',
    margin: '0 0 24px',
    color: '#000',
};

const heading = {
    color: '#111',
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 20px',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
};

const quoteBox = {
    backgroundColor: '#f6f9fc',
    borderLeft: '3px solid #000',
    padding: '12px 16px',
    margin: '0 0 16px',
};

const quoteText = {
    color: '#333',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0',
    whiteSpace: 'pre-line' as const,
};

const buttonRow = {
    textAlign: 'center' as const,
    margin: '28px 0',
};

const button = {
    backgroundColor: '#000',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '700',
    display: 'inline-block',
};

const footer = {
    color: '#888',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '24px 0 0',
};

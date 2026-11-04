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

interface NotificationEmailProps {
    recipientName: string;
    title: string;
    body?: string | null;
    actionUrl: string;
}

export default function NotificationEmail({
    recipientName,
    title,
    body,
    actionUrl,
}: NotificationEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>{title}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>{title}</Heading>
                    <Text style={text}>Hi {recipientName},</Text>
                    {body ? (
                        <Section style={quoteBox}>
                            <Text style={quoteText}>{body}</Text>
                        </Section>
                    ) : null}
                    <Section style={buttonRow}>
                        <Link href={actionUrl} style={button}>
                            View on AuctionsGH
                        </Link>
                    </Section>
                    <Text style={footer}>
                        You are receiving this email because you have a new notification on AuctionsGH.
                        You can change your notification preferences in Settings &gt; Notifications.
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

import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

const SITE = 'https://auctionsgh.com';

export interface SupportReplyEmailProps {
    name: string;
    body: string;
    topic: string;
    originalMessage: string;
}

export default function SupportReplyEmail({ name, body, topic, originalMessage }: SupportReplyEmailProps) {
    const first = (name || '').trim().split(/\s+/)[0] || 'there';
    const quoted = originalMessage.length > 600 ? originalMessage.slice(0, 600) + '...' : originalMessage;
    return (
        <Html lang="en">
            <Head />
            <Preview>{`Reply from AuctionsGH Support: ${topic}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Link href={SITE}>
                            <Img src="cid:auctionsgh-logo" alt="AuctionsGH" width="600" style={logo} />
                        </Link>
                    </Section>
                    <Section style={content}>
                        <Text style={label}>Support reply</Text>
                        <Text style={para}>{`Hi ${first},`}</Text>
                        <Text style={reply}>{body}</Text>
                        <Text style={para}>
                            Kind regards,
                            <br />
                            <strong>AuctionsGH Support</strong>
                            <br />
                            <Link href={SITE} style={link}>auctionsgh.com</Link>
                        </Text>
                        <Hr style={hr} />
                        <Text style={quoteLabel}>{`Your message (${topic})`}</Text>
                        <Text style={quote}>{quoted}</Text>
                    </Section>
                    <Section style={footer}>
                        <Text style={footerText}>You are receiving this because you contacted AuctionsGH support. Reply to this email to continue the conversation.</Text>
                        <Text style={footerText}>© AuctionsGH · Accra, Ghana</Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const main = { backgroundColor: '#f4f4f5', fontFamily: font, margin: 0, padding: '24px 0' };
const container = { maxWidth: '600px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff' };
const header = { backgroundColor: '#0d0d0d', padding: 0, textAlign: 'center' as const };
const logo = { margin: '0', display: 'block', width: '100%', maxWidth: '600px', height: 'auto' };
const content = { padding: '28px 24px 8px' };
const label = { fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#b8902a', fontWeight: 700, margin: '0 0 16px' };
const para = { fontSize: '16px', lineHeight: '24px', color: '#111111', margin: '0 0 16px' };
const reply = { fontSize: '16px', lineHeight: '24px', color: '#111111', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const };
const link = { color: '#b8902a', textDecoration: 'none' };
const hr = { borderColor: '#e5e5e5', margin: '24px 0 16px' };
const quoteLabel = { fontSize: '12px', color: '#6b7280', margin: '0 0 8px' };
const quote = { fontSize: '14px', lineHeight: '20px', color: '#4b5563', margin: '0 0 24px', padding: '0 0 0 12px', borderLeft: '3px solid #e5e5e5', whiteSpace: 'pre-wrap' as const };
const footer = { backgroundColor: '#fafafa', padding: '16px 24px 20px', borderTop: '1px solid #eeeeee' };
const footerText = { fontSize: '12px', lineHeight: '18px', color: '#6b7280', margin: '0 0 6px', textAlign: 'center' as const };

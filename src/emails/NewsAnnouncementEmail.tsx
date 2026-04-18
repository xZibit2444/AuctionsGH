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

interface NewsAnnouncementItem {
    title: string;
    content: string;
}

interface NewsAnnouncementEmailProps {
    recipientName?: string;
    newsUrl: string;
    updates: NewsAnnouncementItem[];
}

export default function NewsAnnouncementEmail({
    recipientName,
    newsUrl,
    updates,
}: NewsAnnouncementEmailProps) {
    const greetingName = recipientName?.trim() || 'there';

    return (
        <Html>
            <Head />
            <Preview>AuctionsGH has a new News & Updates section</Preview>
            <Body style={main}>
                <Container style={container}>
                    <EmailLogo href={newsUrl} />
                    <Heading style={heading}>Our new News & Updates section is live</Heading>
                    <Text style={text}>Hi {greetingName},</Text>
                    <Text style={text}>
                        We&apos;ve launched a new News & Updates section on AuctionsGH to help you keep up with
                        important auction notices, platform announcements, and featured opportunities.
                    </Text>
                    <Text style={text}>
                        Here are a few recent updates now live on the platform:
                    </Text>

                    {updates.map((item, index) => (
                        <Section key={`${item.title}-${index}`} style={card}>
                            <Text style={cardTitle}>{item.title}</Text>
                            <Text style={cardText}>{item.content}</Text>
                        </Section>
                    ))}

                    <Section style={buttonRow}>
                        <Link href={newsUrl} style={button}>
                            Open News & Updates
                        </Link>
                    </Section>

                    <Text style={footer}>
                        You&apos;re receiving this email because you have an AuctionsGH account.
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

const heading = {
    color: '#111',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 20px',
    textAlign: 'center' as const,
};

const text = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 16px',
};

const card = {
    border: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
    padding: '18px 16px',
    marginBottom: '12px',
};

const cardTitle = {
    color: '#111',
    fontSize: '15px',
    fontWeight: '700',
    lineHeight: '22px',
    margin: '0 0 8px',
};

const cardText = {
    color: '#555',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
    whiteSpace: 'pre-line' as const,
};

const buttonRow = {
    textAlign: 'center' as const,
    marginTop: '28px',
    marginBottom: '28px',
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

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    marginTop: '24px',
    textAlign: 'center' as const,
};

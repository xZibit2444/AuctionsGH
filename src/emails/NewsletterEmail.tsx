import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components';

import * as React from 'react';


interface NewsItem {
    title: string;
    content: string;
    created_at: string;
}

interface NewsletterEmailProps {
    items: NewsItem[];
    date?: string;
}

function getDisplayTitle(title: string) {
    return title.replace(/^\[[^\]]+\]\s*/, '').trim();
}

function getCategoryFromTitle(title: string) {
    const match = title.match(/^\[([^\]]+)\]/);
    return match ? match[1].trim() : 'Notice';
}

function parseContent(content: string) {
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex === -1) {
                return { label: '', value: line };
            }
            return {
                label: line.slice(0, separatorIndex).trim(),
                value: line.slice(separatorIndex + 1).trim(),
            };
        });
}


export default function NewsletterEmail({ items, date }: NewsletterEmailProps) {
    const displayDate = date ?? new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <Html>
            <Head />
            <Preview>New auction listings — {displayDate}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Img
                        src={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com'}/logo.png`}
                        alt="AuctionsGH"
                        width="140"
                        height="46"
                        style={logo}
                    />

                    <Heading style={h1}>Auction Listings</Heading>

                    <Text style={subtitle}>{displayDate}</Text>

                    <Text style={intro}>
                        Below are the latest auction notices published on AuctionsGH. View the full listings and updates on our website.
                    </Text>

                    {items.map((item, index) => {
                        const category = getCategoryFromTitle(item.title);
                        const displayTitle = getDisplayTitle(item.title);
                        const parsed = parseContent(item.content);

                        return (
                            <Section key={index} style={card}>
                                <Text style={categoryLabel}>{category}</Text>
                                <Text style={cardTitle}>{displayTitle}</Text>
                                <Hr style={divider} />
                                {parsed.map((entry, i) =>
                                    entry.label ? (
                                        <div key={i} style={rowWrap}>
                                            <Text style={rowLabel}>{entry.label}</Text>
                                            <Text style={rowValue}>{entry.value}</Text>
                                        </div>
                                    ) : (
                                        <Text key={i} style={rowValue}>{entry.value}</Text>
                                    )
                                )}
                            </Section>
                        );
                    })}

                    <Section style={ctaSection}>
                        <Link href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com'}/news`} style={ctaButton}>
                            View all listings
                        </Link>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerText}>
                            You are receiving this email because you have an account on AuctionsGH.
                        </Text>
                        <Link
                            href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com'}/settings`}
                            style={footerLink}
                        >
                            Manage notification preferences
                        </Link>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}


const main = {
    backgroundColor: '#f4f4f4',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '32px 0 48px',
    maxWidth: '600px',
};

const logo = {
    margin: '0 auto 24px',
    display: 'block',
};

const h1 = {
    color: '#000',
    fontSize: '26px',
    fontWeight: '900',
    letterSpacing: '-0.5px',
    margin: '0 0 4px',
    textAlign: 'center' as const,
};

const subtitle = {
    color: '#777',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    margin: '0 0 24px',
};

const intro = {
    color: '#444',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 24px',
    padding: '0 4px',
};

const card = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '2px',
    padding: '20px 24px',
    marginBottom: '16px',
};

const categoryLabel = {
    color: '#888',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    margin: '0 0 6px',
};

const cardTitle = {
    color: '#000',
    fontSize: '16px',
    fontWeight: '900',
    margin: '0 0 12px',
    lineHeight: '1.3',
};

const divider = {
    borderColor: '#ebebeb',
    margin: '0 0 12px',
};

const rowWrap = {
    display: 'flex' as const,
    gap: '8px',
    marginBottom: '6px',
};

const rowLabel = {
    color: '#888',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    minWidth: '110px',
    margin: '0',
    paddingTop: '2px',
};

const rowValue = {
    color: '#333',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 6px',
};

const ctaSection = {
    textAlign: 'center' as const,
    margin: '28px 0',
};

const ctaButton = {
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    padding: '12px 32px',
    display: 'inline-block',
};

const footer = {
    marginTop: '32px',
    textAlign: 'center' as const,
    padding: '0 16px',
};

const footerText = {
    color: '#aaa',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: '0 0 8px',
};

const footerLink = {
    color: '#aaa',
    fontSize: '12px',
    textDecoration: 'underline',
};

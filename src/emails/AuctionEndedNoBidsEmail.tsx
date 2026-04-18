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

interface AuctionEndedNoBidsEmailProps {
    sellerName: string;
    auctionTitle: string;
    dashboardUrl: string;
}

export default function AuctionEndedNoBidsEmail({
    sellerName,
    auctionTitle,
    dashboardUrl,
}: AuctionEndedNoBidsEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your auction ended without bids</Preview>
            <Body style={main}>
                <Container style={container}>
                    <EmailLogo />
                    <Heading style={heading}>Your auction has ended</Heading>
                    <Text style={text}>Hi {sellerName},</Text>
                    <Text style={text}>
                        Your auction for <strong>{auctionTitle}</strong> ended without any bids.
                    </Text>
                    <Text style={text}>
                        You can review the listing from your dashboard and relist it when you are ready.
                    </Text>
                    <Section style={buttonRow}>
                        <Link href={dashboardUrl} style={button}>
                            Open Dashboard
                        </Link>
                    </Section>
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

const buttonRow = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
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

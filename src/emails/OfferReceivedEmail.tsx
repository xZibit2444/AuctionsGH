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

interface OfferReceivedEmailProps {
    sellerName: string;
    buyerName: string;
    auctionTitle: string;
    amount: number;
    auctionUrl: string;
}

export default function OfferReceivedEmail({
    sellerName,
    buyerName,
    auctionTitle,
    amount,
    auctionUrl,
}: OfferReceivedEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>You received a new offer on your listing</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>You received a new offer</Heading>
                    <Text style={text}>Hi {sellerName},</Text>
                    <Text style={text}>
                        <strong>{buyerName}</strong> sent you an offer of <strong>GHS {amount.toLocaleString()}</strong>{' '}
                        for <strong>{auctionTitle}</strong>.
                    </Text>
                    <Text style={text}>
                        Review the offer from your listing page and decide whether to accept or decline it.
                    </Text>
                    <Section style={buttonRow}>
                        <Link href={auctionUrl} style={button}>
                            Review Offer
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

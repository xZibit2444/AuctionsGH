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

interface NewOfferEmailProps {
    sellerName: string;
    buyerName: string;
    auctionTitle: string;
    amount: number;
    auctionUrl: string;
}

export default function NewOfferEmail({
    sellerName,
    buyerName,
    auctionTitle,
    amount,
    auctionUrl,
}: NewOfferEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>New offer of GHS {amount.toLocaleString()} on {auctionTitle}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>You have a new offer!</Heading>
                    <Text style={text}>Hi {sellerName},</Text>
                    <Text style={text}>
                        <strong>{buyerName}</strong> has made an offer of{' '}
                        <strong>GHS {amount.toLocaleString()}</strong> on your listing{' '}
                        <strong>{auctionTitle}</strong>.
                    </Text>
                    <Text style={text}>
                        You can accept or decline this offer from your dashboard. If accepted, the auction will be
                        marked as sold at the offered amount.
                    </Text>
                    <Section style={buttonRow}>
                        <Link href={auctionUrl} style={button}>
                            Review Offer
                        </Link>
                    </Section>
                    <Text style={footer}>
                        If you don&apos;t respond, the offer will remain pending until the auction ends or the buyer
                        makes a new one.
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

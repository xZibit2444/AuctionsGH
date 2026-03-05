import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Text,
    Section,
} from '@react-email/components';
import * as React from 'react';

interface AuctionWonEmailProps {
    userName: string;
    auctionTitle: string;
    winningBidAmount: number;
    checkoutUrl: string;
}

export const AuctionWonEmail = ({
    userName,
    auctionTitle,
    winningBidAmount,
    checkoutUrl,
}: AuctionWonEmailProps) => (
    <Html>
        <Head />
        <Preview>You won {auctionTitle}!</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                </Section>

                <Heading style={h1}>Congratulations, you won!</Heading>

                <Text style={text}>Hi {userName},</Text>
                <Text style={text}>
                    You are the winning bidder for <strong>{auctionTitle}</strong> with your bid of <strong>GHS {winningBidAmount.toLocaleString()}</strong>.
                </Text>
                <Text style={text}>
                    The seller is waiting for you to complete checkout so they can arrange delivery or pickup.
                </Text>

                <Section style={btnContainer}>
                    <Link href={checkoutUrl} style={button}>
                        Complete Checkout
                    </Link>
                </Section>

                <Text style={footer}>
                    This link will expire in 48 hours. If you do not check out in time, the item may be offered to the next highest bidder.
                </Text>
            </Container>
        </Body>
    </Html>
);

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
};

const header = {
    marginBottom: '32px',
};

const logo = {
    fontSize: '24px',
    fontWeight: '900',
    letterSpacing: '-1px',
    margin: '0',
    color: '#000',
};

const h1 = {
    color: '#111',
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 20px',
    padding: '0',
};

const text = {
    color: '#444',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 16px',
};

const btnContainer = {
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

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    marginTop: '48px',
};

export default AuctionWonEmail;

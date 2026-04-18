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

interface OfferDeclinedEmailProps {
    buyerName: string;
    auctionTitle: string;
    amount: number;
    auctionUrl: string;
}

export default function OfferDeclinedEmail({
    buyerName,
    auctionTitle,
    amount,
    auctionUrl,
}: OfferDeclinedEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Your offer was declined</Preview>
            <Body style={main}>
                <Container style={container}>
                    <EmailLogo />
                    <Heading style={heading}>Your offer was declined</Heading>
                    <Text style={text}>Hi {buyerName},</Text>
                    <Text style={text}>
                        The seller declined your offer of <strong>GHS {amount.toLocaleString()}</strong>{' '}
                        for <strong>{auctionTitle}</strong>.
                    </Text>
                    <Text style={text}>
                        You can still return to the listing to place a bid or make another offer if it is still active.
                    </Text>
                    <Section style={buttonRow}>
                        <Link href={auctionUrl} style={button}>
                            View Listing
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

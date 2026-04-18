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

interface SellerApprovedEmailProps {
    fullName?: string;
    dashboardUrl: string;
}

export default function SellerApprovedEmail({
    fullName,
    dashboardUrl,
}: SellerApprovedEmailProps) {
    const greetingName = fullName?.trim() || 'there';

    return (
        <Html>
            <Head />
            <Preview>Your AuctionsGH seller account has been approved</Preview>
            <Body style={main}>
                <Container style={container}>
                    <EmailLogo />
                    <Heading style={heading}>You&apos;re approved to sell</Heading>
                    <Text style={text}>Hi {greetingName},</Text>
                    <Text style={text}>
                        Your seller application has been approved. You can now create listings
                        and start selling on AuctionsGH.
                    </Text>
                    <Text style={text}>
                        Visit your dashboard to manage your account and publish your first listing.
                    </Text>
                    <Section style={buttonRow}>
                        <Link href={dashboardUrl} style={button}>
                            Open Dashboard
                        </Link>
                    </Section>
                    <Text style={footer}>
                        Need help getting started? Reply to this email and our team will help you.
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

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    marginTop: '32px',
};

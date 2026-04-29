import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface BanNotificationEmailProps {
    fullName?: string;
    reason?: string;
}

export default function BanNotificationEmail({
    fullName,
    reason,
}: BanNotificationEmailProps) {
    const greetingName = fullName?.trim() || 'there';

    return (
        <Html>
            <Head />
            <Preview>Your AuctionsGH account has been permanently banned</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>Account Banned</Heading>
                    <Text style={text}>Hi {greetingName},</Text>
                    <Text style={text}>
                        Your AuctionsGH account has been permanently banned due to a violation of our terms of service.
                    </Text>
                    {reason && (
                        <>
                            <Text style={label}>Reason:</Text>
                            <Text style={reasonText}>{reason}</Text>
                        </>
                    )}
                    <Text style={text}>
                        This action is permanent. You will no longer be able to access your account or use our services.
                    </Text>
                    <Text style={footer}>
                        If you believe this is an error, please contact our support team.
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
    color: '#dc2626',
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

const label = {
    color: '#111',
    fontSize: '14px',
    fontWeight: '700',
    margin: '24px 0 8px',
};

const reasonText = {
    color: '#dc2626',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '4px',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    marginTop: '32px',
};

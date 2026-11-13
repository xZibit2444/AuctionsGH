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

interface UnbanNotificationEmailProps {
    fullName?: string;
}

export default function UnbanNotificationEmail({
    fullName,
}: UnbanNotificationEmailProps) {
    const greetingName = fullName?.trim() || 'there';

    return (
        <Html>
            <Head />
            <Preview>Your AuctionsGH account has been reinstated</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>Account Reinstated</Heading>
                    <Text style={text}>Hi {greetingName},</Text>
                    <Text style={text}>
                        Good news - the ban on your AuctionsGH account has been lifted. You can sign in
                        and use the marketplace again right away.
                    </Text>
                    <Text style={text}>
                        Please review our terms of service and safety tips so your account stays in good
                        standing. Repeat violations can lead to a permanent ban.
                    </Text>
                    <Text style={footer}>
                        If you did not expect this message or have questions, please contact our support team.
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
    color: '#059669',
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

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    marginTop: '32px',
};

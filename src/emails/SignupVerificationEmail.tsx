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

interface SignupVerificationEmailProps {
    fullName?: string;
    verificationUrl: string;
}

export default function SignupVerificationEmail({
    fullName,
    verificationUrl,
}: SignupVerificationEmailProps) {
    const greetingName = fullName?.trim() || 'there';

    return (
        <Html>
            <Head />
            <Preview>Verify your AuctionsGH account</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>
                    <Heading style={heading}>Verify your email</Heading>
                    <Text style={text}>Hi {greetingName},</Text>
                    <Text style={text}>
                        Confirm your email address to finish creating your AuctionsGH account.
                        You will not be able to sign in until this step is complete.
                    </Text>
                    <Section style={buttonRow}>
                        <Link href={verificationUrl} style={button}>
                            Verify Email
                        </Link>
                    </Section>
                    <Text style={text}>
                        If the button does not work, open this link:
                    </Text>
                    <Text style={linkText}>
                        <Link href={verificationUrl} style={plainLink}>
                            {verificationUrl}
                        </Link>
                    </Text>
                    <Text style={footer}>
                        If you did not request this, you can ignore this email.
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

const linkText = {
    color: '#444',
    fontSize: '14px',
    lineHeight: '22px',
    wordBreak: 'break-word' as const,
    margin: '0 0 16px',
};

const plainLink = {
    color: '#111',
    textDecoration: 'underline',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    marginTop: '32px',
};

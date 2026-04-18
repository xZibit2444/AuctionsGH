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
} from '@react-email/components';
import * as React from 'react';

export default function ThankYouEmail() {
    return (
        <Html>
            <Head />
            <Preview>Thank you for using AuctionsGH!</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Img
                        src={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/logo.png`}
                        alt="AuctionsGH Logo"
                        width="150"
                        height="50"
                        style={logo}
                    />
                    <Heading style={h1}>Thank You for Using AuctionsGH</Heading>
                    <Section style={section}>
                        <Text style={text}>
                            Dear valued user,
                        </Text>
                        <Text style={text}>
                            We want to extend our heartfelt thanks for being a part of the AuctionsGH community. Your participation and support mean the world to us.
                        </Text>
                        <Text style={text}>
                            We're excited to let you know that exciting updates are coming soon! Stay tuned for new features and improvements that will enhance your auction experience.
                        </Text>
                        <Text style={text}>
                            If you have any feedback or suggestions, please don't hesitate to reach out to us.
                        </Text>
                        <Text style={text}>
                            Best regards,<br />
                            The AuctionsGH Team
                        </Text>
                    </Section>
                    <Section style={footer}>
                        <Text style={footerText}>
                            You're receiving this email because you're a registered user of AuctionsGH.
                        </Text>
                        <Link href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings`} style={link}>
                            Unsubscribe or update preferences
                        </Link>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const logo = {
    margin: '0 auto 20px',
    display: 'block',
};

const main = {
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '600px',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0',
    textAlign: 'center' as const,
};

const section = {
    padding: '24px',
    border: 'solid 1px #dedede',
    borderRadius: '5px',
    textAlign: 'left' as const,
};

const text = {
    color: '#333',
    fontSize: '16px',
    margin: '24px 0',
};

const footer = {
    padding: '24px',
    textAlign: 'center' as const,
};

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
};

const link = {
    color: '#8898aa',
    display: 'block',
    marginTop: '16px',
    textDecoration: 'underline',
};
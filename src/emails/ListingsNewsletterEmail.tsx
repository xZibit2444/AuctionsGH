import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';
import { withNewsletterUtm } from '@/lib/emailLinks';

export interface NewsletterListing {
    title: string;
    detail: string; // e.g. "Good · Greater Accra"
    price: string; // e.g. "₵7,300"
    url: string;
    image: string;
}

export interface ListingsNewsletterProps {
    firstName: string; // empty string -> plain "Hi,"
    dateLabel: string;
    intro: string;
    listings: NewsletterListing[];
    listingsUrl: string;
    unsubscribeUrl: string;
    postalAddress: string;
}

export default function ListingsNewsletterEmail({ firstName, dateLabel, intro, listings, listingsUrl, unsubscribeUrl, postalAddress }: ListingsNewsletterProps) {
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    return (
        <Html lang="en">
            <Head />
            <Preview>{`New on AuctionsGH - ${dateLabel}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={logoWrap}>
                        <Link href={withNewsletterUtm('https://auctionsgh.com', 'listings_newsletter')}>
                            <Img src="cid:auctionsgh-logo" alt="AuctionsGH" width="600" style={logo} />
                        </Link>
                    </Section>
                    <Heading style={h1}>New on AuctionsGH</Heading>
                    <Text style={subtitle}>{dateLabel}</Text>
                    <Text style={introStyle}>{greeting}</Text>
                    <Text style={introStyle}>{intro}</Text>
                    {listings.map((item, i) => (
                        <Section key={i} style={card}>
                            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
                                <tbody>
                                    <tr>
                                        <td width="130" style={{ verticalAlign: 'top' }}>
                                            <Link href={item.url}>
                                                <Img src={item.image} alt={item.title} width="130" height="130" style={photo} />
                                            </Link>
                                        </td>
                                        <td style={{ padding: '4px 0 4px 14px', verticalAlign: 'top' }}>
                                            <Text style={cardTitle}>{item.title}</Text>
                                            <Text style={cardDetail}>{item.detail}</Text>
                                            <Text style={cardPrice}>{item.price}</Text>
                                            <Link href={item.url} style={cardLink}>View listing</Link>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </Section>
                    ))}
                    <Section style={ctaSection}>
                        <Link href={listingsUrl} style={ctaButton}>View all listings</Link>
                    </Section>
                    <Text style={introStyle}>
                        Thanks,
                        <br />
                        <strong>Jason T</strong>
                        <br />
                        AuctionsGH
                    </Text>
                    <Section style={footer}>
                        <Text style={footerText}>You are receiving this because promotional emails are switched on for your AuctionsGH account.</Text>
                        <Text style={footerText}>{postalAddress}</Text>
                        <Text style={footerText}>
                            <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
                            {' | '}
                            <Link href="https://auctionsgh.com/settings" style={footerLink}>Notification settings</Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const main = { backgroundColor: '#f4f4f4', fontFamily: font };
const container = { margin: '0 auto', padding: '0 0 48px', maxWidth: '600px' };
const logoWrap = { backgroundColor: '#0d0d0d', padding: 0, textAlign: 'center' as const, margin: '0 0 24px' };
const logo = { display: 'block', width: '100%', maxWidth: '600px', height: 'auto', margin: 0 };
const h1 = { color: '#000', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px', margin: '0 0 4px', textAlign: 'center' as const };
const subtitle = { color: '#777', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' as const, textAlign: 'center' as const, margin: '0 0 24px' };
const introStyle = { color: '#444', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px', padding: '0 12px' };
const card = { backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '2px', padding: '12px', margin: '0 12px 12px' };
const photo = { display: 'block', width: '130px', height: '130px', objectFit: 'cover' as const };
const cardTitle = { color: '#000', fontSize: '15px', fontWeight: '900', lineHeight: '1.3', margin: '0 0 4px' };
const cardDetail = { color: '#666', fontSize: '12px', margin: '0 0 4px' };
const cardPrice = { color: '#000', fontSize: '17px', fontWeight: '900', margin: '0 0 6px' };
const cardLink = { color: '#000', fontSize: '11px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' as const, textDecoration: 'underline' };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const ctaButton = { backgroundColor: '#000', color: '#fff', fontSize: '12px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' as const, textDecoration: 'none', padding: '12px 32px', display: 'inline-block' };
const footer = { marginTop: '24px', textAlign: 'center' as const, padding: '0 16px' };
const footerText = { color: '#8a8a8a', fontSize: '12px', lineHeight: '1.5', margin: '0 0 6px' };
const footerLink = { color: '#8a8a8a', fontSize: '12px', textDecoration: 'underline' };

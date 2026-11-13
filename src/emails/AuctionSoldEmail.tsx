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



interface AuctionSoldEmailProps {

    sellerName: string;

    auctionTitle: string;

    winningBidAmount: number;

    winnerName: string;
    kind?: 'auction' | 'offer';
}



export const AuctionSoldEmail = ({

    sellerName,

    auctionTitle,

    winningBidAmount,

    winnerName,
    kind = 'auction',
}: AuctionSoldEmailProps) => (

    <Html>

        <Head />

        <Preview>{kind === 'offer' ? `You accepted an offer for ${auctionTitle}` : `Your auction for ${auctionTitle} has sold!`}</Preview>

        <Body style={main}>

            <Container style={container}>

                <Section style={header}>

                    <Text style={logo}>AUCTIONS<span style={{ color: '#666' }}>GH</span></Text>

                </Section>



                <Heading style={h1}>Great news, your item sold!</Heading>



                <Text style={text}>Hi {sellerName},</Text>

                <Text style={text}>

                    {kind === 'offer' ? <>Good news! You accepted an offer for <strong>{auctionTitle}</strong>.</> : <>Congratulations! Your auction for <strong>{auctionTitle}</strong> has successfully ended.</>}

                </Text>

                <Text style={text}>

                    {kind === 'offer' ? <><strong>{winnerName}</strong>&apos;s offer of <strong>GHS {winningBidAmount.toLocaleString()}</strong> is agreed.</> : <>The winning bidder, <strong>{winnerName}</strong>, secured the item with a bid of <strong>GHS {winningBidAmount.toLocaleString()}</strong>.</>}

                </Text>



                <Section style={infoBox}>

                    <Text style={infoBoxTitle}>What happens next?</Text>

                    <Text style={text}>

                        {kind === 'offer' ? 'Chat with the buyer on the Deal & Chat page to arrange payment and pickup, then mark the listing sold when the deal is done.' : 'The buyer has been asked to contact you to arrange payment and pickup. Mark the listing sold once the deal is done.'}

                    </Text>

                    <Text style={text}>

                        {'Payment and handover are arranged directly between you and the buyer. AuctionsGH does not take payment or deliver items.'}

                    </Text>

                </Section>



                <Section style={btnContainer}>

                    <Link href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`} style={button}>

                        View Dashboard

                    </Link>

                </Section>



                <Text style={footer}>

                    Thank you for selling with AuctionsGH.

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



const infoBox = {

    backgroundColor: '#fafafa',

    border: '1px solid #eaeaea',

    borderRadius: '4px',

    padding: '24px',

    marginTop: '24px',

    marginBottom: '24px',

};



const infoBoxTitle = {

    color: '#000',

    fontSize: '18px',

    fontWeight: 'bold',

    margin: '0 0 12px',

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



export default AuctionSoldEmail;

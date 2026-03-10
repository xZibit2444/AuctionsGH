import { Resend } from 'resend';
import OutbidEmail from '@/emails/OutbidEmail';
import AuctionWonEmail from '@/emails/AuctionWonEmail';
import SignupVerificationEmail from '@/emails/SignupVerificationEmail';

// Create a singleton instance of the Resend client
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Fallback sender email (you'll need to verify a domain in Resend later to change this)
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'AuctionsGH <onboarding@resend.dev>';

export async function sendOutbidEmail(
    to: string,
    userName: string,
    auctionTitle: string,
    newBidAmount: number,
    auctionId: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, auctionTitle });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `You've been outbid on ${auctionTitle}!`,
            react: OutbidEmail({
                userName,
                auctionTitle,
                newBidAmount,
                auctionUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auctions/${auctionId}`,
            }),
        });

        if (error) {
            console.error('Failed to send outbid email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending outbid email:', error);
        return { success: false, error };
    }
}

export async function sendAuctionWonEmail(
    to: string,
    userName: string,
    auctionTitle: string,
    winningBidAmount: number,
    auctionId: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, auctionTitle });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `You won ${auctionTitle}! 🥳`,
            react: AuctionWonEmail({
                userName,
                auctionTitle,
                winningBidAmount,
                checkoutUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/${auctionId}`,
            }),
        });

        if (error) {
            console.error('Failed to send auction won email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending auction won email:', error);
        return { success: false, error };
    }
}

export async function sendSignupVerificationEmail(
    to: string,
    fullName: string,
    verificationUrl: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: 'Verify your AuctionsGH account',
            react: SignupVerificationEmail({
                fullName,
                verificationUrl,
            }),
        });

        if (error) {
            console.error('Failed to send signup verification email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending signup verification email:', error);
        return { success: false, error };
    }
}

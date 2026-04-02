import { Resend } from 'resend';
import OutbidEmail from '@/emails/OutbidEmail';
import AuctionWonEmail from '@/emails/AuctionWonEmail';
import AuctionSoldEmail from '@/emails/AuctionSoldEmail';
import SignupVerificationEmail from '@/emails/SignupVerificationEmail';
import SellerApprovedEmail from '@/emails/SellerApprovedEmail';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'AuctionsGH <onboarding@resend.dev>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
                auctionUrl: `${SITE_URL}/auctions/${auctionId}`,
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
            subject: `You won ${auctionTitle}!`,
            react: AuctionWonEmail({
                userName,
                auctionTitle,
                winningBidAmount,
                checkoutUrl: `${SITE_URL}/checkout/${auctionId}`,
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

export async function sendAuctionSoldEmail(
    to: string,
    sellerName: string,
    auctionTitle: string,
    winningBidAmount: number,
    winnerName: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, auctionTitle });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `Your item sold: ${auctionTitle}`,
            react: AuctionSoldEmail({
                sellerName,
                auctionTitle,
                winningBidAmount,
                winnerName,
            }),
        });

        if (error) {
            console.error('Failed to send auction sold email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending auction sold email:', error);
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

export async function sendSellerApprovedEmail(
    to: string,
    fullName?: string | null
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: 'Your seller account has been approved',
            react: SellerApprovedEmail({
                fullName: fullName ?? undefined,
                dashboardUrl: `${SITE_URL}/dashboard`,
            }),
        });

        if (error) {
            console.error('Failed to send seller approved email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending seller approved email:', error);
        return { success: false, error };
    }
}

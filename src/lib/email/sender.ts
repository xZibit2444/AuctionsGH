import { Resend } from 'resend';
import AuctionEndedNoBidsEmail from '@/emails/AuctionEndedNoBidsEmail';
import AuctionSoldEmail from '@/emails/AuctionSoldEmail';
import AuctionWonEmail from '@/emails/AuctionWonEmail';
import OfferDeclinedEmail from '@/emails/OfferDeclinedEmail';
import OrderCompletedSummaryEmail from '@/emails/OrderCompletedSummaryEmail';
import OrderConfirmedBuyerEmail from '@/emails/OrderConfirmedBuyerEmail';
import OrderConfirmedSellerEmail from '@/emails/OrderConfirmedSellerEmail';
import OutbidEmail from '@/emails/OutbidEmail';
import SellerApprovedEmail from '@/emails/SellerApprovedEmail';
import SignupVerificationEmail from '@/emails/SignupVerificationEmail';
import ThankYouEmail from '@/emails/ThankYouEmail';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'AuctionsGH <noreply@auctionsgh.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface OrderCompletedSummaryEmailPayload {
    recipientName: string;
    auctionTitle: string;
    orderNumber: string;
    amountLabel: string;
    completionDateLabel: string;
    placedDateLabel: string;
    fulfillmentLabel: string;
    meetupLocation: string;
    otherPartyLabel: string;
    orderUrl: string;
    sellerNote?: string | null;
    transcript: Array<{
        id: string;
        senderName: string;
        sentAtLabel: string;
        body: string;
    }>;
}

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    return apiKey ? new Resend(apiKey) : null;
}

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

export async function sendAuctionEndedNoBidsEmail(
    to: string,
    sellerName: string,
    auctionTitle: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, auctionTitle });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `Your auction ended without bids: ${auctionTitle}`,
            react: AuctionEndedNoBidsEmail({
                sellerName,
                auctionTitle,
                dashboardUrl: `${SITE_URL}/dashboard`,
            }),
        });

        if (error) {
            console.error('Failed to send no-bids email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending no-bids email:', error);
        return { success: false, error };
    }
}

export async function sendOfferDeclinedEmail(
    to: string,
    buyerName: string,
    auctionTitle: string,
    amount: number,
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
            subject: `Your offer was declined for ${auctionTitle}`,
            react: OfferDeclinedEmail({
                buyerName,
                auctionTitle,
                amount,
                auctionUrl: `${SITE_URL}/auctions/${auctionId}`,
            }),
        });

        if (error) {
            console.error('Failed to send offer declined email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending offer declined email:', error);
        return { success: false, error };
    }
}

export async function sendOrderConfirmedBuyerEmail(
    to: string,
    buyerName: string,
    auctionTitle: string,
    orderId: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, auctionTitle, orderId });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `Order confirmed: ${auctionTitle}`,
            react: OrderConfirmedBuyerEmail({
                buyerName,
                auctionTitle,
                orderUrl: `${SITE_URL}/orders/${orderId}`,
            }),
        });

        if (error) {
            console.error('Failed to send buyer order confirmation email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending buyer order confirmation email:', error);
        return { success: false, error };
    }
}

export async function sendOrderConfirmedSellerEmail(
    to: string,
    sellerName: string,
    auctionTitle: string,
    orderId: string
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, auctionTitle, orderId });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `Buyer confirmed order: ${auctionTitle}`,
            react: OrderConfirmedSellerEmail({
                sellerName,
                auctionTitle,
                orderUrl: `${SITE_URL}/orders/${orderId}`,
            }),
        });

        if (error) {
            console.error('Failed to send seller order confirmation email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending seller order confirmation email:', error);
        return { success: false, error };
    }
}

export async function sendOrderCompletedSummaryEmail(
    to: string,
    payload: OrderCompletedSummaryEmailPayload
) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to, orderNumber: payload.orderNumber });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: `Order #${payload.orderNumber} complete: ${payload.auctionTitle}`,
            react: OrderCompletedSummaryEmail(payload),
        });

        if (error) {
            console.error('Failed to send order completion summary email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending order completion summary email:', error);
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

export async function sendThankYouEmail(to: string) {
    const resend = getResend();
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Email not sent.', { to });
        return { success: false, error: 'API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to,
            subject: 'Thank you for using AuctionsGH!',
            react: ThankYouEmail({}),
        });

        if (error) {
            console.error('Failed to send thank you email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending thank you email:', error);
        return { success: false, error };
    }
}

import { Resend } from 'resend';

// Support replies use their own sender (approved by the owner), separate from the order-email sender.
// Customer answers go to the Reply-To inbox, not the dashboard.
export const SUPPORT_SENDER = process.env.SUPPORT_REPLY_FROM || 'AuctionsGH Support <support@auctionsgh.com>';
export const SUPPORT_REPLY_TO = process.env.SUPPORT_REPLY_TO || 'tiekujason@gmail.com';

// Sending stays off until the owner turns it on.
export const SUPPORT_REPLIES_ENABLED = process.env.SUPPORT_REPLIES_ENABLED === 'true';

export async function sendSupportReplyEmail(args: {
    to: string;
    subject: string;
    text: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
    if (!SUPPORT_REPLIES_ENABLED) return { ok: false, error: 'Email replies are not turned on yet.' };
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: 'Email sending is not configured.' };
    try {
        const resend = new Resend(key);
        const { data, error } = await resend.emails.send({
            from: SUPPORT_SENDER,
            replyTo: SUPPORT_REPLY_TO,
            to: args.to,
            subject: args.subject,
            text: args.text,
        });
        if (error) return { ok: false, error: error.message || 'The email provider rejected the message.' };
        return { ok: true, id: data?.id ?? null };
    } catch {
        return { ok: false, error: 'Could not reach the email provider.' };
    }
}

import { Resend } from 'resend';
import { LOGO_PNG_BASE64 } from '@/emails/logoData';
import SupportReplyEmail from '@/emails/SupportReplyEmail';

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
    name: string;
    topic: string;
    originalMessage: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
    if (!SUPPORT_REPLIES_ENABLED) return { ok: false, error: 'Email replies are not turned on yet.' };
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: 'Email sending is not configured.' };
    try {
        const resend = new Resend(key);
        const { data, error } = await resend.emails.send({
            from: SUPPORT_SENDER,
            replyTo: SUPPORT_REPLY_TO,
            attachments: [{ filename: 'auctionsgh-logo.png', content: LOGO_PNG_BASE64, contentType: 'image/png', contentId: 'auctionsgh-logo' }],
            to: args.to,
            subject: args.subject,
            react: SupportReplyEmail({ name: args.name, body: args.text, topic: args.topic, originalMessage: args.originalMessage }),
            text: `Hi ${(args.name || '').trim().split(/\s+/)[0] || 'there'},\n\n${args.text}\n\nKind regards,\nAuctionsGH Support\nhttps://auctionsgh.com\n\n---\nYour message (${args.topic}):\n${args.originalMessage}\n`,
        });
        if (error) return { ok: false, error: error.message || 'The email provider rejected the message.' };
        return { ok: true, id: data?.id ?? null };
    } catch {
        return { ok: false, error: 'Could not reach the email provider.' };
    }
}

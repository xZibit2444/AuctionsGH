import { Resend } from 'resend';

// Same configured sender the site already uses for its order and auction emails.
// No fallback address: if it is not configured, sending is refused.
export const SUPPORT_SENDER = process.env.RESEND_FROM_EMAIL || '';

// Sending stays off until the owner confirms the sender and turns it on.
export const SUPPORT_REPLIES_ENABLED = process.env.SUPPORT_REPLIES_ENABLED === 'true' && SUPPORT_SENDER !== '';

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

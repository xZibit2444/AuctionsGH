import { Resend } from 'resend';

// Same sender configuration the site already uses for its order and auction emails.
export const SUPPORT_SENDER = process.env.RESEND_FROM_EMAIL || 'AuctionsGH <noreply@auctionsgh.com>';

export async function sendSupportReplyEmail(args: {
    to: string;
    subject: string;
    text: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
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

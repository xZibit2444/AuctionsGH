import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isNotificationEnabled } from '@/lib/notifications';
import { sendNewMessageEmail } from '@/lib/email/sender';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function getDisplayName(
    profile: { full_name?: string | null; username?: string | null } | null,
    fallback: string
) {
    return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

/**
 * Emails the recipient of a new chat message, when their new_message
 * notification preference allows it. Non-fatal: failures are logged only.
 */
export async function emailNewMessageIfEnabled(
    supabase: SupabaseClient<Database>,
    args: {
        recipientId: string;
        senderId: string;
        auctionTitle: string;
        messageBody: string;
        chatUrl: string;
    }
) {
    try {
        const enabled = await isNotificationEnabled(supabase, args.recipientId, 'new_message');
        if (!enabled) return { skipped: true };

        const [recipientAuth, { data: recipientProfile }, { data: senderProfile }] = await Promise.all([
            supabase.auth.admin.getUserById(args.recipientId),
            supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', args.recipientId)
                .maybeSingle(),
            supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', args.senderId)
                .maybeSingle(),
        ]);

        const recipientEmail = recipientAuth.data.user?.email;
        if (!recipientEmail) return { skipped: true };

        const recipientName = getDisplayName(recipientProfile, 'there');
        const senderName = getDisplayName(senderProfile, 'A user');
        const preview = args.messageBody.length > 200
            ? `${args.messageBody.slice(0, 200)}…`
            : args.messageBody;

        const result = await sendNewMessageEmail(
            recipientEmail,
            recipientName,
            senderName,
            args.auctionTitle,
            preview,
            args.chatUrl
        );
        if (!result.success) {
            console.error('Failed to send new message email:', result.error);
        }
        return { skipped: false };
    } catch (err) {
        console.error('Error sending new message email (non-fatal):', err);
        return { skipped: true };
    }
}

export function orderChatUrl(orderId: string) {
    return `${SITE_URL}/orders/${orderId}`;
}

export function offerChatUrl(offerId: string) {
    return `${SITE_URL}/offers/${offerId}`;
}

export function auctionChatUrl(auctionId: string) {
    return `${SITE_URL}/auctions/${auctionId}`;
}

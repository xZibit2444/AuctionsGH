import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type ProfileNotificationPreferences =
    NonNullable<Database['public']['Tables']['profiles']['Row']['notification_preferences']>;

type NotificationPreferenceKey = keyof ProfileNotificationPreferences;

type AppNotificationType =
    | 'new_bid'
    | 'auction_won'
    | 'new_message'
    | 'outbid'
    | 'auction_ended'
    | 'new_offer'
    | 'system';

interface NotificationInsert {
    user_id: string;
    type: AppNotificationType;
    title: string;
    body?: string | null;
    auction_id?: string | null;
    order_id?: string | null;
    /** Set when a dedicated templated email already covers this event, so the
     *  generic notification email does not duplicate it. */
    skipEmail?: boolean;
}

const NOTIFICATION_PREFERENCE_MAP: Partial<Record<AppNotificationType, NotificationPreferenceKey>> = {
    new_bid: 'new_bid',
    auction_won: 'auction_won',
    new_message: 'new_message',
};

export async function isNotificationEnabled(
    supabase: SupabaseClient<Database>,
    userId: string,
    type: AppNotificationType
) {
    const preferenceKey = NOTIFICATION_PREFERENCE_MAP[type];
    if (!preferenceKey) return true;

    const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .maybeSingle();

    const profile = data as { notification_preferences?: ProfileNotificationPreferences | null } | null;

    if (error || !profile?.notification_preferences) return true;

    return profile.notification_preferences[preferenceKey] ?? true;
}

export async function insertNotificationIfEnabled(
    supabase: SupabaseClient<Database>,
    notification: NotificationInsert
) {
    const enabled = await isNotificationEnabled(supabase, notification.user_id, notification.type);
    if (!enabled) {
        return { skipped: true, error: null };
    }

    // Only real notifications columns may reach PostgREST: helper-only flags
    // like skipEmail are rejected as unknown columns, which silently dropped
    // every notification that set them (offer alerts since 2026-11-04).
    const { skipEmail, ...row } = notification;

    // Database types in this repo lag behind the live schema for notifications.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { error } = await (supabase.from('notifications') as any).insert(row);

    if (error) {
        console.error('Failed to insert notification:', notification.type, error.message ?? error);

        // The live notification_type enum may not include newer values (for example
        // 'new_offer'). Retry as a generic 'system' notification so the alert still
        // shows in the in-app panel instead of being dropped.
        if (notification.type !== 'system' && /enum|notification_type|invalid input value/i.test(error.message ?? '')) {
            ({ error } = await (supabase.from('notifications') as any).insert({ ...row, type: 'system' }));
            if (error) console.error('Fallback notification insert failed:', error.message ?? error);
        }
    }

    // Fire-and-forget Expo push to any registered device tokens for this user
    void sendExpoPushIfTokens(supabase, notification).catch(() => {/* non-critical */});

    // Email a copy of every in-app notification, unless a dedicated templated
    // email already covers the event (skipEmail) or the richer new-message
    // email handles it. Fire-and-forget; failures are logged only.
    if (!error && !skipEmail && notification.type !== 'new_message') {
        void emailNotificationCopy(supabase, notification).catch((err) => {
            console.error('Notification email failed (non-fatal):', err);
        });
    }

    return { skipped: false, error };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Emails the recipient a copy of an in-app notification. Best-effort: any
 * failure is logged and swallowed so alerts are never blocked by email.
 */
export async function emailNotificationCopy(
    supabase: SupabaseClient<Database>,
    notification: NotificationInsert
) {
    try {
        const [{ data: authData }, { data: profile }] = await Promise.all([
            supabase.auth.admin.getUserById(notification.user_id),
            supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', notification.user_id)
                .maybeSingle(),
        ]);

        const email = authData.user?.email;
        if (!email) return;

        const named = profile as { full_name?: string | null; username?: string | null } | null;
        const name = named?.full_name?.trim() || named?.username?.trim() || 'there';

        const actionUrl = notification.order_id
            ? `${SITE_URL}/orders/${notification.order_id}`
            : notification.auction_id
                ? `${SITE_URL}/auctions/${notification.auction_id}`
                : SITE_URL;

        const { sendNotificationEmail } = await import('@/lib/email/sender');
        const result = await sendNotificationEmail(
            email,
            name,
            notification.title,
            notification.body ?? null,
            actionUrl
        );
        if (!result.success) {
            console.error('Failed to send notification email:', result.error);
        }
    } catch (err) {
        console.error('Error sending notification email (non-fatal):', err);
    }
}

async function sendExpoPushIfTokens(
    supabase: SupabaseClient<Database>,
    notification: NotificationInsert
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tokenRows } = await (supabase as any)
        .from('device_push_tokens')
        .select('token')
        .eq('user_id', notification.user_id) as { data: { token: string }[] | null };

    if (!tokenRows || tokenRows.length === 0) return;

    const messages = tokenRows.map(({ token }) => ({
        to: token,
        title: notification.title,
        body: notification.body ?? undefined,
        data: {
            type: notification.type,
            auction_id: notification.auction_id ?? undefined,
            order_id: notification.order_id ?? undefined,
        },
        sound: 'default' as const,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
    });
}

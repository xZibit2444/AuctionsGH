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
    notification: NotificationInsert,
    options: { ignorePreference?: boolean } = {}
) {
    // Order-chat messages are transactional: new_message defaults to false in the
    // profile preferences, which silently dropped every seller alert. Callers can
    // opt out of the preference check for those in-app notifications.
    const enabled = options.ignorePreference
        ? true
        : await isNotificationEnabled(supabase, notification.user_id, notification.type);
    if (!enabled) {
        return { skipped: true, error: null };
    }

    // Database types in this repo lag behind the live schema for notifications.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { error } = await (supabase.from('notifications') as any).insert(notification);

    if (error) {
        console.error('Failed to insert notification:', notification.type, error.message ?? error);

        // The live notification_type enum may not include newer values (for example
        // 'new_offer'). Retry as a generic 'system' notification so the alert still
        // shows in the in-app panel instead of being dropped.
        if (notification.type !== 'system' && /enum|notification_type|invalid input value/i.test(error.message ?? '')) {
            ({ error } = await (supabase.from('notifications') as any).insert({ ...notification, type: 'system' }));
            if (error) console.error('Fallback notification insert failed:', error.message ?? error);
        }
    }

    // Fire-and-forget Expo push to any registered device tokens for this user
    void sendExpoPushIfTokens(supabase, notification).catch(() => {/* non-critical */});

    return { skipped: false, error };
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

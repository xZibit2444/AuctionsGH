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
    notification: NotificationInsert
) {
    const enabled = await isNotificationEnabled(supabase, notification.user_id, notification.type);
    if (!enabled) {
        return { skipped: true, error: null };
    }

    // Database types in this repo lag behind the live schema for notifications.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notifications') as any).insert(notification);
    return { skipped: false, error };
}

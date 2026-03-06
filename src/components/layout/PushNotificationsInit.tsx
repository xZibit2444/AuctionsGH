'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Mounts inside <Providers> so it has access to the auth context.
 * Registers the device for FCM push notifications in the Capacitor Android app.
 * Renders nothing — purely a side-effect component.
 */
export default function PushNotificationsInit() {
    const { user } = useAuth();
    usePushNotifications(user?.id);
    return null;
}

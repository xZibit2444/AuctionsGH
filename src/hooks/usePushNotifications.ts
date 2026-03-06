'use client';

import { useEffect, useRef } from 'react';

/**
 * Registers for FCM push notifications when running inside the Capacitor Android app.
 * - Requests native permission on first launch
 * - Saves FCM token to the user's profile in Supabase
 * - On notification tap, navigates to the relevant page (auction / order / chat)
 */
export function usePushNotifications(userId?: string) {
    const userIdRef = useRef(userId);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        // Only run inside the Capacitor native container
        const capacitor = (typeof window !== 'undefined') ? (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor : undefined;
        if (!capacitor?.isNativePlatform?.()) return;

        let mounted = true;
        const listeners: Array<{ remove: () => Promise<void> }> = [];

        const setup = async () => {
            const { PushNotifications } = await import('@capacitor/push-notifications');

            const permission = await PushNotifications.requestPermissions();
            if (!mounted || permission.receive !== 'granted') return;

            await PushNotifications.register();

            // FCM registration token received
            const l1 = await PushNotifications.addListener('registration', async (token) => {
                const uid = userIdRef.current;
                if (!uid) return;
                try {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient();
                    await supabase
                        .from('profiles')
                        .update({ fcm_token: token.value })
                        .eq('id', uid);
                } catch {
                    // Non-critical — app works without stored token
                }
            });

            const l2 = await PushNotifications.addListener('registrationError', (err) => {
                console.error('[PushNotifications] Registration error:', err.error);
            });

            // Foreground notification — the web app already handles in-app alerts
            // via Supabase realtime, so no additional UI is needed here.
            const l3 = await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
                // intentionally quiet — realtime handles in-app display
            });

            // User tapped a notification from the system tray
            const l4 = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                const data = action.notification.data as {
                    url?: string;
                    auctionId?: string;
                    orderId?: string;
                    chatId?: string;
                } | undefined;

                if (data?.url) {
                    window.location.href = data.url;
                } else if (data?.auctionId) {
                    window.location.href = `/auctions/${data.auctionId}`;
                } else if (data?.orderId) {
                    window.location.href = `/orders/${data.orderId}`;
                } else if (data?.chatId) {
                    window.location.href = `/dashboard?chat=${data.chatId}`;
                }
            });

            if (mounted) {
                listeners.push(l1, l2, l3, l4);
            } else {
                // Component unmounted before async setup finished
                [l1, l2, l3, l4].forEach((l) => l.remove());
            }
        };

        setup();

        return () => {
            mounted = false;
            listeners.forEach((l) => l.remove());
        };
    }, []); // runs once — userId changes are handled via ref
}

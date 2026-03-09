'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type NotificationConsent = 'accepted' | 'dismissed';

const CONSENT_STORAGE_KEY = 'push-notifications-consent-v1';

interface AppNotificationPayload {
    id: string;
    title: string;
    body: string | null;
    auction_id?: string | null;
    order_id?: string | null;
}

function getNotificationTarget(payload: AppNotificationPayload) {
    if (payload.order_id) return `/orders/${payload.order_id}`;
    if (payload.auction_id) return `/auctions/${payload.auction_id}`;
    return '/';
}

function getNotificationId(rawId: string) {
    let hash = 0;
    for (let i = 0; i < rawId.length; i += 1) {
        hash = ((hash << 5) - hash + rawId.charCodeAt(i)) | 0;
    }

    return Math.abs(hash) || Date.now();
}

function isNativePlatform() {
    if (typeof window === 'undefined') return false;
    const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(capacitor?.isNativePlatform?.());
}

export function usePushNotifications(userId?: string) {
    const userIdRef = useRef(userId);
    const [isSupported, setIsSupported] = useState(false);
    const [canPrompt, setCanPrompt] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const consent = window.localStorage.getItem(CONSENT_STORAGE_KEY) as NotificationConsent | null;
        const native = isNativePlatform();
        const webSupported = 'Notification' in window;

        setIsSupported(native || webSupported);

        if (native) {
            setPermissionGranted(consent === 'accepted');
            setCanPrompt(Boolean(userId) && consent !== 'accepted' && consent !== 'dismissed');
            return;
        }

        if (!webSupported) {
            setPermissionGranted(false);
            setCanPrompt(false);
            return;
        }

        if (window.Notification.permission === 'granted') {
            window.localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
            setPermissionGranted(true);
            setCanPrompt(false);
            return;
        }

        if (window.Notification.permission === 'denied') {
            window.localStorage.setItem(CONSENT_STORAGE_KEY, 'dismissed');
            setPermissionGranted(false);
            setCanPrompt(false);
            return;
        }

        setPermissionGranted(consent === 'accepted');
        setCanPrompt(Boolean(userId) && consent !== 'accepted' && consent !== 'dismissed');
    }, [userId]);

    useEffect(() => {
        if (!userId || !permissionGranted) return;

        const supabase = createClient();
        const native = isNativePlatform();
        let mounted = true;
        const listeners: Array<{ remove: () => Promise<void> }> = [];

        const navigateFromData = (data?: {
            url?: string;
            auctionId?: string;
            orderId?: string;
            chatId?: string;
        }) => {
            if (data?.url) {
                window.location.href = data.url;
            } else if (data?.auctionId) {
                window.location.href = `/auctions/${data.auctionId}`;
            } else if (data?.orderId) {
                window.location.href = `/orders/${data.orderId}`;
            } else if (data?.chatId) {
                window.location.href = `/dashboard?chat=${data.chatId}`;
            }
        };

        const setupNativePush = async () => {
            if (!native) return;

            const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
                import('@capacitor/push-notifications'),
                import('@capacitor/local-notifications'),
            ]);

            await PushNotifications.register();

            const registrationListener = await PushNotifications.addListener('registration', async (token) => {
                const currentUserId = userIdRef.current;
                if (!currentUserId) return;

                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (supabase.from('profiles') as any)
                        .update({ fcm_token: token.value })
                        .eq('id', currentUserId);
                } catch {
                    // Storing the token is best-effort only.
                }
            });

            const registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
                console.error('[PushNotifications] Registration error:', error.error);
            });

            const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
                const data = event.notification.data as {
                    url?: string;
                    auctionId?: string;
                    orderId?: string;
                    chatId?: string;
                } | undefined;

                navigateFromData(data);
            });

            const localActionListener = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
                const data = event.notification.extra as {
                    url?: string;
                    auctionId?: string;
                    orderId?: string;
                    chatId?: string;
                } | undefined;

                navigateFromData(data);
            });

            if (!mounted) {
                await registrationListener.remove();
                await registrationErrorListener.remove();
                await actionListener.remove();
                await localActionListener.remove();
                return;
            }

            listeners.push(
                registrationListener,
                registrationErrorListener,
                actionListener,
                localActionListener
            );
        };

        const showNativeNotification = async (payload: AppNotificationPayload) => {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: getNotificationId(payload.id),
                        title: payload.title,
                        body: payload.body ?? '',
                        schedule: { at: new Date(Date.now() + 50) },
                        extra: {
                            url: getNotificationTarget(payload),
                            auctionId: payload.auction_id ?? undefined,
                            orderId: payload.order_id ?? undefined,
                        },
                    },
                ],
            });
        };

        const showBrowserNotification = (payload: AppNotificationPayload) => {
            if (typeof window === 'undefined' || !('Notification' in window)) return;
            if (window.Notification.permission !== 'granted') return;
            if (document.visibilityState === 'visible') return;

            const browserNotification = new window.Notification(payload.title, {
                body: payload.body ?? undefined,
                tag: payload.id,
            });

            browserNotification.onclick = () => {
                window.focus();
                window.location.href = getNotificationTarget(payload);
                browserNotification.close();
            };
        };

        void setupNativePush();

        const channel = supabase
            .channel(`device-notifications:${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const notification = payload.new as AppNotificationPayload;

                    if (native) {
                        void showNativeNotification(notification);
                        return;
                    }

                    showBrowserNotification(notification);
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            void supabase.removeChannel(channel);
            listeners.forEach((listener) => {
                void listener.remove();
            });
        };
    }, [permissionGranted, userId]);

    const requestNotifications = async () => {
        if (typeof window === 'undefined' || busy) return false;

        setBusy(true);

        try {
            if (isNativePlatform()) {
                const [{ PushNotifications }, { LocalNotifications }] = await Promise.all([
                    import('@capacitor/push-notifications'),
                    import('@capacitor/local-notifications'),
                ]);

                const localPermission = await LocalNotifications.requestPermissions();
                const pushPermission = await PushNotifications.requestPermissions();
                const granted = localPermission.display === 'granted' && pushPermission.receive === 'granted';

                window.localStorage.setItem(CONSENT_STORAGE_KEY, granted ? 'accepted' : 'dismissed');
                setPermissionGranted(granted);
                setCanPrompt(false);
                return granted;
            }

            if (!('Notification' in window)) {
                setCanPrompt(false);
                return false;
            }

            const permission = await window.Notification.requestPermission();
            const granted = permission === 'granted';

            window.localStorage.setItem(CONSENT_STORAGE_KEY, granted ? 'accepted' : 'dismissed');
            setPermissionGranted(granted);
            setCanPrompt(false);
            return granted;
        } finally {
            setBusy(false);
        }
    };

    const dismissPrompt = () => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(CONSENT_STORAGE_KEY, 'dismissed');
        }
        setCanPrompt(false);
    };

    return {
        isSupported,
        canPrompt,
        permissionGranted,
        busy,
        requestNotifications,
        dismissPrompt,
    };
}

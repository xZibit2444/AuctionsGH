import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotifications(token: string): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device.');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted.');
        return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'AuctionsGH',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#f59e0b',
        });
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = pushTokenData.data;

    // Register token with the backend
    try {
        await fetch(`${API_BASE}/api/device-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                token: expoPushToken,
                platform: Platform.OS,
            }),
        });
    } catch (e) {
        console.warn('Failed to register push token with backend:', e);
    }

    return expoPushToken;
}

export async function deregisterPushToken(expoPushToken: string, accessToken: string) {
    try {
        await fetch(`${API_BASE}/api/device-tokens`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ token: expoPushToken }),
        });
    } catch (e) {
        console.warn('Failed to deregister push token:', e);
    }
}

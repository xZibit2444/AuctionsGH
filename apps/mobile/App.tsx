import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { registerForPushNotifications, deregisterPushToken } from './src/lib/pushNotifications';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import AuctionDetailScreen from './src/screens/AuctionDetailScreen';
import OfferChatScreen from './src/screens/OfferChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrdersScreen from './src/screens/OrdersScreen';

type Screen =
    | { name: 'home' }
    | { name: 'profile' }
    | { name: 'orders' }
    | { name: 'detail'; auctionId: string }
    | { name: 'offerChat'; auctionId: string; auctionTitle: string; sellerId: string; buyerId: string; offerId: string; offerStatus: 'pending' | 'accepted' | 'declined' };

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [screen, setScreen] = useState<Screen>({ name: 'home' });
    const pushTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) { setLoadingSession(false); return; }
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null);
            setLoadingSession(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s ?? null);
            if (!s) {
                // Deregister push token on sign-out
                if (pushTokenRef.current) {
                    void supabase.auth.getSession().then(({ data }) => {
                        if (data.session && pushTokenRef.current) {
                            void deregisterPushToken(pushTokenRef.current, data.session.access_token);
                        }
                    });
                    pushTokenRef.current = null;
                }
                setScreen({ name: 'home' });
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    // Register push token once session is available
    useEffect(() => {
        if (!session || pushTokenRef.current) return;
        registerForPushNotifications(session.access_token).then(t => {
            if (t) pushTokenRef.current = t;
        });
    }, [session?.user.id]);

    if (!isSupabaseConfigured || loadingSession) {
        return (
            <SafeAreaView style={styles.centered}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    if (!session) {
        return (
            <>
                <StatusBar style="dark" />
                <AuthScreen onAuthenticated={() => setScreen({ name: 'home' })} />
            </>
        );
    }

    if (screen.name === 'profile') {
        return (
            <>
                <StatusBar style="dark" />
                <ProfileScreen
                    session={session}
                    onBack={() => setScreen({ name: 'home' })}
                    onOpenOrders={() => setScreen({ name: 'orders' })}
                    onSignOut={() => setScreen({ name: 'home' })}
                />
            </>
        );
    }

    if (screen.name === 'orders') {
        return (
            <>
                <StatusBar style="dark" />
                <OrdersScreen
                    session={session}
                    onBack={() => setScreen({ name: 'profile' })}
                />
            </>
        );
    }

    if (screen.name === 'detail') {
        return (
            <>
                <StatusBar style="dark" />
                <AuctionDetailScreen
                    session={session}
                    auctionId={screen.auctionId}
                    onBack={() => setScreen({ name: 'home' })}
                    onOpenChat={(auctionId, auctionTitle, sellerId, buyerId, offerId, offerStatus) =>
                        setScreen({ name: 'offerChat', auctionId, auctionTitle, sellerId, buyerId, offerId, offerStatus })
                    }
                />
            </>
        );
    }

    if (screen.name === 'offerChat') {
        return (
            <>
                <StatusBar style="dark" />
                <OfferChatScreen
                    session={session}
                    auctionId={screen.auctionId}
                    auctionTitle={screen.auctionTitle}
                    sellerId={screen.sellerId}
                    buyerId={screen.buyerId}
                    offerId={screen.offerId}
                    offerStatus={screen.offerStatus}
                    onBack={() => setScreen({ name: 'detail', auctionId: screen.auctionId })}
                />
            </>
        );
    }

    return (
        <>
            <StatusBar style="dark" />
            <HomeScreen
                session={session}
                onSelectAuction={id => setScreen({ name: 'detail', auctionId: id })}
                onOpenProfile={() => setScreen({ name: 'profile' })}
                onSignOut={() => supabase.auth.signOut()}
            />
        </>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
});

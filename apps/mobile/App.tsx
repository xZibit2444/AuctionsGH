import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { registerForPushNotifications, deregisterPushToken } from './src/lib/pushNotifications';
import type { HomeStackParams, ProfileStackParams, DashboardStackParams, TabParams } from './src/navigation/types';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import AuctionDetailScreen from './src/screens/AuctionDetailScreen';
import OfferChatScreen from './src/screens/OfferChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreateAuctionScreen from './src/screens/CreateAuctionScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import SavedScreen from './src/screens/SavedScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SellerApplyScreen from './src/screens/SellerApplyScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import SellerProfileScreen from './src/screens/SellerProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// ─── Session context ──────────────────────────────────────────────────────────

export const SessionContext = createContext<Session | null>(null);
export function useSession() { return useContext(SessionContext)!; }

// ─── Navigation param types (see src/navigation/types.ts) ────────────────────
export type { DashboardStackParams } from './src/navigation/types';

const HomeStack = createNativeStackNavigator<HomeStackParams>();
const ProfileStack = createNativeStackNavigator<ProfileStackParams>();
const DashboardStack = createNativeStackNavigator<DashboardStackParams>();
const Tab = createBottomTabNavigator<TabParams>();
const Root = createNativeStackNavigator();

// ─── Screen wrappers (bridge callback-based screens → React Navigation) ───────

function HomeScreenWrapper({ navigation }: NativeStackScreenProps<HomeStackParams, 'Home'>) {
    const session = useSession();
    return (
        <HomeScreen
            session={session}
            onSelectAuction={id => navigation.navigate('AuctionDetail', { auctionId: id })}
            onOpenProfile={() => navigation.getParent<BottomTabScreenProps<TabParams>['navigation']>()?.navigate('ProfileTab')}
            onSignOut={() => { void supabase.auth.signOut(); }}
        />
    );
}

function AuctionDetailWrapper({ navigation, route }: NativeStackScreenProps<HomeStackParams, 'AuctionDetail'>) {
    const session = useSession();
    return (
        <AuctionDetailScreen
            session={session}
            auctionId={route.params.auctionId}
            onBack={() => navigation.goBack()}
            onOpenChat={(auctionId, auctionTitle, sellerId, buyerId, offerId, offerStatus) =>
                navigation.navigate('OfferChat', { auctionId, auctionTitle, sellerId, buyerId, offerId, offerStatus })
            }
            onOpenSellerProfile={id => navigation.navigate('SellerProfile', { sellerId: id })}
        />
    );
}

function SellerProfileWrapper({ navigation, route }: NativeStackScreenProps<HomeStackParams, 'SellerProfile'>) {
    const session = useSession();
    return (
        <SellerProfileScreen
            sellerId={route.params.sellerId}
            session={session!}
            onBack={() => navigation.goBack()}
            onSelectAuction={id => navigation.navigate('AuctionDetail', { auctionId: id })}
        />
    );
}

function OfferChatWrapper({ navigation, route }: NativeStackScreenProps<HomeStackParams, 'OfferChat'>) {
    const session = useSession();
    return (
        <OfferChatScreen
            session={session}
            {...route.params}
            onBack={() => navigation.goBack()}
        />
    );
}

function ProfileScreenWrapper({ navigation }: NativeStackScreenProps<ProfileStackParams, 'Profile'>) {
    const session = useSession();
    return (
        <ProfileScreen
            session={session}
            onBack={() => navigation.getParent<BottomTabScreenProps<TabParams>['navigation']>()?.navigate('HomeTab')}
            onOpenOrders={() => navigation.navigate('Orders')}
            onOpenSaved={() => navigation.navigate('Saved')}
            onOpenSettings={() => navigation.navigate('Settings')}
            onOpenSellerApply={() => navigation.navigate('SellerApply')}
            onOpenNotifications={() => navigation.navigate('Notifications')}
            onSignOut={() => { void supabase.auth.signOut(); }}
        />
    );
}

function OrdersWrapper({ navigation }: NativeStackScreenProps<ProfileStackParams, 'Orders'>) {
    const session = useSession();
    return <OrdersScreen session={session} onBack={() => navigation.goBack()} onSelectOrder={id => navigation.navigate('OrderDetail', { orderId: id })} />;
}

function OrderDetailWrapper({ navigation, route }: NativeStackScreenProps<ProfileStackParams, 'OrderDetail'>) {
    const session = useSession();
    return <OrderDetailScreen orderId={route.params.orderId} session={session!} onBack={() => navigation.goBack()} />;
}

function DashboardWrapper({ navigation }: NativeStackScreenProps<DashboardStackParams, 'Dashboard'>) {
    const session = useSession();
    return <DashboardScreen navigation={navigation} route={{ key: 'Dashboard', name: 'Dashboard' }} session={session!} />;
}

function DashboardOrdersWrapper({ navigation }: NativeStackScreenProps<DashboardStackParams, 'Orders'>) {
    const session = useSession();
    return <OrdersScreen session={session} onBack={() => navigation.goBack()} onSelectOrder={id => navigation.navigate('OrderDetail', { orderId: id })} />;
}

function DashboardOrderDetailWrapper({ navigation, route }: NativeStackScreenProps<DashboardStackParams, 'OrderDetail'>) {
    const session = useSession();
    return <OrderDetailScreen orderId={route.params.orderId} session={session!} onBack={() => navigation.goBack()} />;
}

function CreateAuctionWrapper({ navigation }: NativeStackScreenProps<DashboardStackParams, 'CreateAuction'>) {
    const session = useSession();
    return <CreateAuctionScreen navigation={navigation} route={{ key: 'CreateAuction', name: 'CreateAuction' }} session={session!} />;
}

function CheckoutWrapper({ navigation, route }: NativeStackScreenProps<DashboardStackParams, 'Checkout'>) {
    const session = useSession();
    return <CheckoutScreen navigation={navigation} route={route} session={session!} />;
}

function SavedWrapper({ navigation }: NativeStackScreenProps<ProfileStackParams, 'Saved'>) {
    const session = useSession();
    return (
        <SavedScreen
            session={session!}
            onBack={() => navigation.goBack()}
            onSelectAuction={id => navigation.getParent()?.navigate('HomeTab', { screen: 'AuctionDetail', params: { auctionId: id } })}
        />
    );
}

function SettingsWrapper({ navigation }: NativeStackScreenProps<ProfileStackParams, 'Settings'>) {
    const session = useSession();
    return <SettingsScreen session={session!} onBack={() => navigation.goBack()} onSignOut={() => { void supabase.auth.signOut(); }} />;
}

function SellerApplyWrapper({ navigation }: NativeStackScreenProps<ProfileStackParams, 'SellerApply'>) {
    const session = useSession();
    return <SellerApplyScreen session={session!} onBack={() => navigation.goBack()} />;
}

function NotificationsWrapper({ navigation }: NativeStackScreenProps<ProfileStackParams, 'Notifications'>) {
    const session = useSession();
    return (
        <NotificationsScreen
            session={session!}
            onBack={() => navigation.goBack()}
            onOpenAuction={id => navigation.getParent()?.navigate('HomeTab', { screen: 'AuctionDetail', params: { auctionId: id } })}
            onOpenOrder={id => navigation.navigate('OrderDetail', { orderId: id })}
        />
    );
}

// ─── Stack / Tab navigators ───────────────────────────────────────────────────

const stackOpts = { headerShown: false, animation: 'slide_from_right' as const };

function HomeStackNav() {
    return (
        <HomeStack.Navigator screenOptions={stackOpts}>
            <HomeStack.Screen name="Home" component={HomeScreenWrapper} />
            <HomeStack.Screen name="AuctionDetail" component={AuctionDetailWrapper} />
            <HomeStack.Screen name="SellerProfile" component={SellerProfileWrapper} />
            <HomeStack.Screen name="OfferChat" component={OfferChatWrapper} />
        </HomeStack.Navigator>
    );
}

function ProfileStackNav() {
    return (
        <ProfileStack.Navigator screenOptions={stackOpts}>
            <ProfileStack.Screen name="Profile" component={ProfileScreenWrapper} />
            <ProfileStack.Screen name="Orders" component={OrdersWrapper} />
            <ProfileStack.Screen name="OrderDetail" component={OrderDetailWrapper} />
            <ProfileStack.Screen name="Saved" component={SavedWrapper} />
            <ProfileStack.Screen name="Settings" component={SettingsWrapper} />
            <ProfileStack.Screen name="SellerApply" component={SellerApplyWrapper} />
            <ProfileStack.Screen name="Notifications" component={NotificationsWrapper} />
        </ProfileStack.Navigator>
    );
}

function DashboardStackNav() {
    return (
        <DashboardStack.Navigator screenOptions={stackOpts}>
            <DashboardStack.Screen name="Dashboard" component={DashboardWrapper} />
            <DashboardStack.Screen name="CreateAuction" component={CreateAuctionWrapper} />
            <DashboardStack.Screen name="Checkout" component={CheckoutWrapper} />
            <DashboardStack.Screen name="Orders" component={DashboardOrdersWrapper} />
            <DashboardStack.Screen name="OrderDetail" component={DashboardOrderDetailWrapper} />
        </DashboardStack.Navigator>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#f59e0b',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarStyle: { borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeStackNav}
                options={{ title: 'Auctions', tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{'🏛'}</Text> }}
            />
            <Tab.Screen
                name="DashboardTab"
                component={DashboardStackNav}
                options={{ title: 'Dashboard', tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{'📊'}</Text> }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStackNav}
                options={{ title: 'Profile', tabBarIcon: ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{'👤'}</Text> }}
            />
        </Tab.Navigator>
    );
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const pushTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) { setLoadingSession(false); return; }
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null);
            setLoadingSession(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s ?? null);
            if (!s && pushTokenRef.current) {
                const tok = pushTokenRef.current;
                pushTokenRef.current = null;
                supabase.auth.getSession().then(({ data }) => {
                    if (data.session) void deregisterPushToken(tok, data.session.access_token);
                });
            }
        });
        return () => subscription.unsubscribe();
    }, []);

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

    return (
        <SessionContext.Provider value={session}>
            <StatusBar style="dark" />
            <NavigationContainer>
                <Root.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
                    {session ? (
                        <Root.Screen name="Main" component={MainTabs} />
                    ) : (
                        <Root.Screen name="Auth">
                            {() => <AuthScreen onAuthenticated={() => {/* handled by onAuthStateChange */}} />}
                        </Root.Screen>
                    )}
                </Root.Navigator>
            </NavigationContainer>
        </SessionContext.Provider>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
});

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, SafeAreaView, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchMobileProfile, type MobileProfile } from '../features/home/data';

interface Stats {
    listings: number;
    activeListings: number;
    bids: number;
}

interface Props {
    session: Session;
    onBack: () => void;
    onOpenOrders: () => void;
    onOpenSaved: () => void;
    onOpenSettings: () => void;
    onOpenSellerApply: () => void;
    onOpenNotifications: () => void;
    onOpenWonAuctions: () => void;
    onSignOut: () => void;
}

export default function ProfileScreen({ session, onBack, onOpenOrders, onOpenSaved, onOpenSettings, onOpenSellerApply, onOpenNotifications, onOpenWonAuctions, onSignOut }: Props) {
    const [profile, setProfile] = useState<MobileProfile | null>(null);
    const [stats, setStats] = useState<Stats>({ listings: 0, activeListings: 0, bids: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [p, listingsRes, activRes, bidsRes] = await Promise.all([
                    fetchMobileProfile(session.user.id),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (supabase as any)
                        .from('auctions')
                        .select('id', { count: 'exact', head: true })
                        .eq('seller_id', session.user.id),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (supabase as any)
                        .from('auctions')
                        .select('id', { count: 'exact', head: true })
                        .eq('seller_id', session.user.id)
                        .eq('status', 'active'),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (supabase as any)
                        .from('bids')
                        .select('id', { count: 'exact', head: true })
                        .eq('bidder_id', session.user.id),
                ]);
                setProfile(p);
                setStats({
                    listings: listingsRes.count ?? 0,
                    activeListings: activRes.count ?? 0,
                    bids: bidsRes.count ?? 0,
                });
            } catch {
                Alert.alert('Error', 'Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [session.user.id]);

    const initials = profile?.full_name
        ? profile.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        : (profile?.username?.[0] ?? session.user.email?.[0] ?? 'U').toUpperCase();

    const displayName = profile?.full_name || profile?.username || session.user.email?.split('@')[0] || 'User';

    const handleSignOut = () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => { void supabase.auth.signOut(); onSignOut(); } },
        ]);
    };

    if (loading) {
        return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" /></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.name}>{displayName}</Text>
                    {profile?.username && (
                        <Text style={styles.username}>@{profile.username}</Text>
                    )}
                    {profile?.location && (
                        <Text style={styles.location}>📍 {profile.location}</Text>
                    )}
                    <Text style={styles.email}>{session.user.email}</Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <StatCard label="Total Listings" value={stats.listings} />
                    <StatCard label="Active" value={stats.activeListings} />
                    <StatCard label="Bids Placed" value={stats.bids} />
                </View>

                {/* Nav rows */}
                <TouchableOpacity style={styles.navRow} onPress={onOpenNotifications}>
                    <Text style={styles.navRowText}>🔔  Notifications</Text>
                    <Text style={styles.navRowArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={onOpenWonAuctions}>
                    <Text style={styles.navRowText}>🏆  Won Auctions</Text>
                    <Text style={styles.navRowArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={onOpenOrders}>
                    <Text style={styles.navRowText}>📦  My Orders</Text>
                    <Text style={styles.navRowArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={onOpenSaved}>
                    <Text style={styles.navRowText}>🔖  Saved Auctions</Text>
                    <Text style={styles.navRowArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={onOpenSellerApply}>
                    <Text style={styles.navRowText}>🏪  Become a Seller</Text>
                    <Text style={styles.navRowArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navRow} onPress={onOpenSettings}>
                    <Text style={styles.navRowText}>⚙️  Settings</Text>
                    <Text style={styles.navRowArrow}>›</Text>
                </TouchableOpacity>

                {/* Account details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <InfoRow label="Email" value={session.user.email ?? '—'} />
                    <InfoRow label="Role" value={profile?.is_admin ? 'Admin' : 'Member'} />
                    <InfoRow
                        label="Member since"
                        value={new Date(session.user.created_at).toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })}
                    />
                </View>

                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff',
    },
    backBtn: {},
    backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    content: { padding: 20, gap: 20, paddingBottom: 40 },
    avatarSection: { alignItems: 'center', gap: 6 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#111827' },
    name: { fontSize: 22, fontWeight: '700', color: '#111827' },
    username: { fontSize: 14, color: '#6b7280' },
    location: { fontSize: 13, color: '#6b7280' },
    email: { fontSize: 12, color: '#9ca3af' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', gap: 4,
    },
    statValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
    statLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
    section: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 11, fontWeight: '700', color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: 1,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
    },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: '#f3f4f6',
    },
    infoLabel: { fontSize: 14, color: '#6b7280' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: '60%', textAlign: 'right' },
    navRow: {
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    navRowText: { fontSize: 15, fontWeight: '600', color: '#111827' },
    navRowArrow: { fontSize: 20, color: '#9ca3af' },
    signOutBtn: {
        backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
        alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5',
    },
    signOutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});

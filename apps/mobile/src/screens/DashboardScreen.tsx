import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, RefreshControl, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParams } from '../navigation/types';
import {
    fetchBuyerStats, fetchMyListings, fetchSellerStats, fetchWonAuctions,
    type MobileBuyerStats, type MobileListing, type MobileSellerStats,
} from '../features/home/data';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<DashboardStackParams, 'Dashboard'> & { session: Session };

type Tab = 'buyer' | 'seller';

const GHS = (n: number) => `GH₵ ${n.toLocaleString()}`;

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    );
}

export default function DashboardScreen({ navigation, session }: Props) {
    const userId = session.user.id;
    const token = session.access_token;

    const [tab, setTab] = useState<Tab>('buyer');
    const [buyerStats, setBuyerStats] = useState<MobileBuyerStats | null>(null);
    const [sellerStats, setSellerStats] = useState<MobileSellerStats | null>(null);
    const [listings, setListings] = useState<MobileListing[]>([]);
    const [wonAuctions, setWonAuctions] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [buyer, profile] = await Promise.all([
            fetchBuyerStats(userId),
            supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
        ]);
        setBuyerStats(buyer);
        const admin = (profile.data as { is_admin: boolean } | null)?.is_admin ?? false;
        setIsAdmin(admin);

        const [won] = await Promise.all([fetchWonAuctions(userId)]);
        setWonAuctions(won);

        if (admin) {
            const [seller, myListings] = await Promise.all([
                fetchSellerStats(userId),
                fetchMyListings(userId),
            ]);
            setSellerStats(seller);
            setListings(myListings);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => { void load(); }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const handleDelete = (auctionId: string, title: string) => {
        Alert.alert('Delete Listing', `Delete "${title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    setDeletingId(auctionId);
                    try {
                        const res = await fetch(
                            `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/listings/${auctionId}`,
                            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
                        );
                        if (res.ok) setListings(l => l.filter(x => x.id !== auctionId));
                        else Alert.alert('Error', 'Could not delete listing.');
                    } catch { Alert.alert('Error', 'Network error.'); }
                    setDeletingId(null);
                },
            },
        ]);
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                {isAdmin && (
                    <TouchableOpacity style={styles.sellBtn} onPress={() => navigation.navigate('CreateAuction')}>
                        <Text style={styles.sellBtnText}>+ New Listing</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Tab bar — only show to sellers */}
            {isAdmin && (
                <View style={styles.tabs}>
                    {(['buyer', 'seller'] as Tab[]).map(t => (
                        <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                                {t === 'buyer' ? 'Buyer' : 'Seller'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* ── Buyer tab ── */}
            {tab === 'buyer' && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Buyer Stats</Text>
                    <View style={styles.statsGrid}>
                        <StatCard label="Bids Placed" value={buyerStats?.totalBids ?? 0} />
                        <StatCard label="Auctions Won" value={buyerStats?.wonAuctions ?? 0} />
                        <StatCard label="Total Spent" value={GHS(buyerStats?.totalSpent ?? 0)} />
                        <StatCard label="Pending Orders" value={buyerStats?.pendingOrders ?? 0} />
                    </View>

                    {wonAuctions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Won — Pending Checkout</Text>
                            {wonAuctions.map((a) => {
                                const img = a.auction_images?.[0]?.url;
                                return (
                                    <TouchableOpacity
                                        key={a.id}
                                        style={styles.listingRow}
                                        onPress={() => navigation.navigate('Checkout', { auctionId: a.id })}
                                    >
                                        {img
                                            ? <Image source={{ uri: img }} style={styles.thumb} />
                                            : <View style={[styles.thumb, styles.thumbPlaceholder]} />
                                        }
                                        <View style={styles.listingInfo}>
                                            <Text style={styles.listingTitle} numberOfLines={1}>{a.title}</Text>
                                            <Text style={styles.listingPrice}>{GHS(a.current_price)}</Text>
                                        </View>
                                        <View style={styles.badgeOrange}>
                                            <Text style={styles.badgeText}>CHECKOUT</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Orders')}>
                        <Text style={styles.linkText}>View All Orders →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Seller tab ── */}
            {tab === 'seller' && isAdmin && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Seller Stats</Text>
                    <View style={styles.statsGrid}>
                        <StatCard label="Total Listings" value={sellerStats?.totalListings ?? 0} />
                        <StatCard label="Active" value={sellerStats?.activeListings ?? 0} />
                        <StatCard label="Sold" value={sellerStats?.soldListings ?? 0} />
                        <StatCard label="Revenue" value={GHS(sellerStats?.totalRevenue ?? 0)} />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>My Listings</Text>
                    {listings.length === 0
                        ? <Text style={styles.empty}>No listings yet.</Text>
                        : listings.map((a) => {
                            const img = a.auction_images?.[0]?.url;
                            const statusColor = a.status === 'active' ? '#10b981' : a.status === 'sold' ? '#f59e0b' : '#6b7280';
                            return (
                                <View key={a.id} style={styles.listingRow}>
                                    {img
                                        ? <Image source={{ uri: img }} style={styles.thumb} />
                                        : <View style={[styles.thumb, styles.thumbPlaceholder]} />
                                    }
                                    <View style={styles.listingInfo}>
                                        <Text style={styles.listingTitle} numberOfLines={1}>{a.title}</Text>
                                        <Text style={styles.listingPrice}>{GHS(a.current_price)} · {a.bid_count} bids</Text>
                                        <View style={[styles.badge, { backgroundColor: statusColor }]}>
                                            <Text style={styles.badgeText}>{a.status.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDelete(a.id, a.title)}
                                        disabled={deletingId === a.id}
                                    >
                                        <Text style={styles.deleteBtnText}>
                                            {deletingId === a.id ? '...' : 'Delete'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    }
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    title: { fontSize: 22, fontWeight: '900', color: '#000' },
    sellBtn: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 8 },
    sellBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#000' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
    tabTextActive: { color: '#000' },
    section: { padding: 16 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
    statLabel: { fontSize: 10, fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    statValue: { fontSize: 22, fontWeight: '900', color: '#000' },
    listingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8, gap: 12 },
    thumb: { width: 56, height: 56 },
    thumbPlaceholder: { backgroundColor: '#e5e7eb' },
    listingInfo: { flex: 1, gap: 3 },
    listingTitle: { fontSize: 14, fontWeight: '700', color: '#000' },
    listingPrice: { fontSize: 12, color: '#6b7280' },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2 },
    badgeOrange: { backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'center' },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#fca5a5' },
    deleteBtnText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
    linkRow: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
    linkText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
    empty: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 24 },
});

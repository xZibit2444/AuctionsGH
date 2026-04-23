import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl, SafeAreaView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
    fetchActiveAuctions, fetchMobileProfile,
    type MobileAuctionListItem, type MobileProfile,
} from '../features/home/data';

interface Props {
    session: Session;
    onSelectAuction: (id: string) => void;
    onOpenProfile: () => void;
    onSignOut: () => void;
}

export default function HomeScreen({ session, onSelectAuction, onOpenProfile, onSignOut }: Props) {
    const [profile, setProfile] = useState<MobileProfile | null>(null);
    const [auctions, setAuctions] = useState<MobileAuctionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [p, a] = await Promise.all([
                fetchMobileProfile(session.user.id),
                fetchActiveAuctions(),
            ]);
            if (p?.is_banned) { await supabase.auth.signOut(); return; }
            setProfile(p);
            setAuctions(a);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session.user.id]);

    useEffect(() => { void loadData(); }, [loadData]);

    // Realtime auction price / status updates
    useEffect(() => {
        channelRef.current = supabase
            .channel('home:auctions')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, (payload) => {
                const next = payload.new as {
                    id: string; current_price: number; bid_count: number; status: string; ends_at: string;
                };
                setAuctions(prev => prev.map(a =>
                    a.id === next.id
                        ? { ...a, current_price: next.current_price, bid_count: next.bid_count, status: next.status, ends_at: next.ends_at }
                        : a
                ));
            })
            .subscribe();
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, []);

    const renderItem = ({ item }: { item: MobileAuctionListItem }) => (
        <TouchableOpacity style={styles.card} onPress={() => onSelectAuction(item.id)}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            {(item.brand || item.model) && (
                <Text style={styles.cardMeta}>{[item.brand, item.model].filter(Boolean).join(' ')}</Text>
            )}
            <Text style={styles.cardPrice}>GHS {Number(item.current_price).toLocaleString()}</Text>
            <View style={styles.cardRow}>
                <Text style={styles.cardMeta}>{item.bid_count} bid{item.bid_count !== 1 ? 's' : ''}</Text>
                <Text style={styles.cardMeta}>Ends {new Date(item.ends_at).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AuctionsGH</Text>
                <TouchableOpacity onPress={onOpenProfile} style={styles.profileBtn}>
                    <Text style={styles.profileBtnText}>
                        {profile?.full_name?.split(' ')[0] ?? profile?.username ?? 'Profile'}
                    </Text>
                </TouchableOpacity>
            </View>

            {profile && (
                <Text style={styles.welcome}>
                    Welcome{profile.full_name ? `, ${profile.full_name}` : ''}
                </Text>
            )}

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" /></View>
            ) : (
                <FlatList
                    data={auctions}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); void loadData(true); }}
                        />
                    }
                    ListEmptyComponent={
                        <Text style={styles.empty}>No active auctions right now.</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    profileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
    profileBtnText: { fontSize: 13, fontWeight: '600', color: '#111827' },
    welcome: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#374151' },
    list: { padding: 12, gap: 10, paddingBottom: 24 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 4 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    cardMeta: { fontSize: 13, color: '#6b7280' },
    cardPrice: { fontSize: 17, fontWeight: '700', color: '#111827', marginVertical: 2 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 60 },
});

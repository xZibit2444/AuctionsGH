import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, FlatList, Image, RefreshControl,
    SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface WonAuction {
    id: string;
    title: string;
    brand: string | null;
    current_price: number;
    updated_at: string;
    auction_images: { url: string }[];
    orderId: string | null;
}

interface Props {
    session: Session;
    onBack: () => void;
    onOpenCheckout: (auctionId: string) => void;
    onOpenOrder: (orderId: string) => void;
}

export default function WonAuctionsScreen({ session, onBack, onOpenCheckout, onOpenOrder }: Props) {
    const userId = session.user.id;
    const [items, setItems] = useState<WonAuction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true); else setRefreshing(true);

        try {
            // Fetch all won auctions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: auctions } = await (supabase.from('auctions') as any)
                .select('id, title, brand, current_price, updated_at, auction_images(url)')
                .eq('winner_id', userId)
                .eq('status', 'sold')
                .order('updated_at', { ascending: false })
                .limit(50);

            const auctionRows = (auctions ?? []) as Omit<WonAuction, 'orderId'>[];
            if (auctionRows.length === 0) {
                setItems([]);
                return;
            }

            // Fetch existing orders for these auctions
            const auctionIds = auctionRows.map(a => a.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: orders } = await (supabase.from('orders') as any)
                .select('id, auction_id')
                .eq('buyer_id', userId)
                .in('auction_id', auctionIds);

            const orderMap: Record<string, string> = {};
            ((orders ?? []) as { id: string; auction_id: string }[]).forEach(o => {
                orderMap[o.auction_id] = o.id;
            });

            setItems(auctionRows.map(a => ({ ...a, orderId: orderMap[a.id] ?? null })));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useEffect(() => { void load(); }, [load]);

    const pending = items.filter(i => !i.orderId);
    const completed = items.filter(i => !!i.orderId);

    const renderItem = ({ item }: { item: WonAuction }) => {
        const thumb = item.auction_images?.[0]?.url;
        const hasOrder = !!item.orderId;

        return (
            <View style={styles.card}>
                <View style={styles.cardRow}>
                    {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                        <View style={[styles.thumb, styles.thumbPlaceholder]}>
                            <Text style={{ fontSize: 22 }}>📦</Text>
                        </View>
                    )}
                    <View style={styles.cardBody}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                        {item.brand && <Text style={styles.cardMeta}>{item.brand}</Text>}
                        <Text style={styles.cardPrice}>GHS {Number(item.current_price).toLocaleString()}</Text>
                    </View>
                </View>

                {hasOrder ? (
                    <TouchableOpacity style={styles.viewOrderBtn} onPress={() => onOpenOrder(item.orderId!)}>
                        <Text style={styles.viewOrderText}>View Order →</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.checkoutBtn} onPress={() => onOpenCheckout(item.id)}>
                        <Text style={styles.checkoutText}>Complete Order →</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const allItems = [...pending, ...completed];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Won Auctions 🏆</Text>
                <View style={{ width: 60 }} />
            </View>

            {pending.length > 0 && (
                <View style={styles.alertBanner}>
                    <Text style={styles.alertText}>
                        {pending.length} auction{pending.length > 1 ? 's' : ''} awaiting checkout
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" /></View>
            ) : (
                <FlatList
                    data={allItems}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={allItems.length === 0 ? styles.emptyContainer : styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
                    ListHeaderComponent={
                        allItems.length > 0 ? (
                            <Text style={styles.sectionLabel}>
                                {pending.length > 0
                                    ? `${pending.length} pending · ${completed.length} ordered`
                                    : `${completed.length} ordered`}
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🏆</Text>
                            <Text style={styles.emptyTitle}>No won auctions yet</Text>
                            <Text style={styles.emptyBody}>When you win an auction it will appear here for checkout.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
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
    alertBanner: {
        backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#fde68a',
    },
    alertText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
    list: { padding: 14, gap: 12, paddingBottom: 40 },
    emptyContainer: { flex: 1 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    card: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 12,
    },
    cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#e5e7eb' },
    thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, gap: 3 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 },
    cardMeta: { fontSize: 12, color: '#6b7280' },
    cardPrice: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 2 },
    checkoutBtn: {
        backgroundColor: '#16a34a', borderRadius: 8,
        paddingVertical: 10, alignItems: 'center',
    },
    checkoutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    viewOrderBtn: {
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
        paddingVertical: 10, alignItems: 'center', backgroundColor: '#f9fafb',
    },
    viewOrderText: { color: '#374151', fontWeight: '600', fontSize: 14 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
    emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl,
    SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { fetchMyOrders, type MobileOrder } from '../features/home/data';

interface Props {
    session: Session;
    onBack: () => void;
    onSelectOrder?: (orderId: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
    completed:       '#16a34a',
    pin_verified:    '#16a34a',
    pending_meetup:  '#d97706',
    pending_payment: '#d97706',
    funds_held:      '#2563eb',
    in_delivery:     '#2563eb',
    ghosted:         '#dc2626',
    pin_refused:     '#dc2626',
    returning:       '#7c3aed',
    refunded:        '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
    completed:       'Completed',
    pin_verified:    'Verified',
    pending_meetup:  'Pending Meetup',
    pending_payment: 'Pending Payment',
    funds_held:      'Funds Held',
    in_delivery:     'In Delivery',
    ghosted:         'Ghosted',
    pin_refused:     'PIN Refused',
    returning:       'Returning',
    refunded:        'Refunded',
};

export default function OrdersScreen({ session, onBack, onSelectOrder }: Props) {
    const [orders, setOrders] = useState<MobileOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        else setRefreshing(true);
        try {
            const data = await fetchMyOrders(session.user.id);
            setOrders(data);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const isBuyer = (order: MobileOrder) => order.buyer_id === session.user.id;

    const otherPartyName = (order: MobileOrder) =>
        order.other_party?.full_name || order.other_party?.username || 'Unknown';

    const renderItem = ({ item }: { item: MobileOrder }) => {
        const statusColor = STATUS_COLOR[item.status] ?? '#6b7280';
        const statusLabel = STATUS_LABEL[item.status] ?? item.status.replace(/_/g, ' ');
        const role = isBuyer(item) ? 'Buyer' : 'Seller';
        const preview = [...(item.auction?.auction_images ?? [])]
            .sort((a, b) => a.position - b.position)[0];

        return (
            <TouchableOpacity style={styles.card} onPress={() => onSelectOrder?.(item.id)} activeOpacity={onSelectOrder ? 0.7 : 1}>
                <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                            {item.auction?.title ?? 'Order'}
                        </Text>
                        {item.auction?.brand && (
                            <Text style={styles.cardMeta}>{item.auction.brand}</Text>
                        )}
                    </View>
                    <View style={[styles.badge, { borderColor: statusColor }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardRow}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Amount</Text>
                        <Text style={styles.infoValue}>GHS {Number(item.amount).toLocaleString()}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Your role</Text>
                        <Text style={styles.infoValue}>{role}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>{isBuyer(item) ? 'Seller' : 'Buyer'}</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{otherPartyName(item)}</Text>
                    </View>
                </View>

                {item.meetup_at && (
                    <Text style={styles.cardMeta}>
                        Meetup: {new Date(item.meetup_at).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                )}
                {item.meetup_location && (
                    <Text style={styles.cardMeta}>📍 {item.meetup_location}</Text>
                )}

                <Text style={styles.cardDate}>
                    {item.fulfillment_type === 'meet_and_inspect' ? 'Meet & Inspect' : 'Escrow Delivery'} ·{' '}
                    {new Date(item.created_at).toLocaleDateString('en-GH')}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Orders</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" /></View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={o => o.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No orders yet.{'\n'}Win an auction to see your orders here.</Text>
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
    list: { padding: 14, gap: 12, paddingBottom: 40 },
    card: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 8,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    badge: {
        borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: '#f3f4f6' },
    cardRow: { flexDirection: 'row', gap: 8 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
    cardDate: { fontSize: 11, color: '#9ca3af' },
    empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 80, lineHeight: 22 },
});

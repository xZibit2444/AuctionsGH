import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, FlatList, SafeAreaView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Notification = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    is_read: boolean;
    created_at: string;
    auction_id: string | null;
    order_id: string | null;
};

interface Props {
    session: Session;
    onBack: () => void;
    onOpenAuction: (auctionId: string) => void;
    onOpenOrder: (orderId: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
    outbid: '⚡',
    auction_won: '🏆',
    auction_ended: '🔔',
    new_bid: '💰',
    new_message: '💬',
    system: '📣',
};

function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen({ session, onBack, onOpenAuction, onOpenOrder }: Props) {
    const userId = session.user.id;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('notifications') as any)
            .select('id, type, title, body, is_read, created_at, auction_id, order_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(60);
        setNotifications((data ?? []) as Notification[]);
        setLoading(false);
    }, [userId]);

    const markAllRead = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('notifications') as any)
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }, [userId]);

    useEffect(() => {
        void load();

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                payload => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                }
            )
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    }, [userId, load]);

    useEffect(() => {
        void markAllRead();
    }, [markAllRead]);

    const handleTap = (n: Notification) => {
        if (n.order_id) { onOpenOrder(n.order_id); return; }
        if (n.auction_id) { onOpenAuction(n.auction_id); }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 60 }} />
            </View>

            {!loading && unreadCount > 0 && (
                <View style={styles.unreadBanner}>
                    <Text style={styles.unreadText}>{unreadCount} unread</Text>
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markReadBtn}>Mark all read</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={n => n.id}
                    contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🔔</Text>
                            <Text style={styles.emptyTitle}>No notifications yet</Text>
                            <Text style={styles.emptyBody}>You'll be notified about bids, offers, orders, and messages here.</Text>
                        </View>
                    }
                    renderItem={({ item: n }) => {
                        const tappable = !!(n.auction_id || n.order_id);
                        return (
                            <TouchableOpacity
                                style={[styles.row, !n.is_read && styles.rowUnread]}
                                onPress={() => handleTap(n)}
                                disabled={!tappable}
                                activeOpacity={tappable ? 0.6 : 1}
                            >
                                <View style={styles.iconWrap}>
                                    <Text style={styles.icon}>{TYPE_ICONS[n.type] ?? '🔔'}</Text>
                                </View>
                                <View style={styles.rowBody}>
                                    <View style={styles.rowTop}>
                                        <Text style={styles.rowTitle} numberOfLines={1}>{n.title}</Text>
                                        {!n.is_read && <View style={styles.dot} />}
                                    </View>
                                    {n.body ? <Text style={styles.rowBodyText} numberOfLines={2}>{n.body}</Text> : null}
                                    <Text style={styles.rowTime}>{timeAgo(n.created_at)}</Text>
                                </View>
                                {tappable && <Text style={styles.arrow}>›</Text>}
                            </TouchableOpacity>
                        );
                    }}
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
    unreadBanner: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fffbeb', paddingHorizontal: 16, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: '#fde68a',
    },
    unreadText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
    markReadBtn: { fontSize: 12, fontWeight: '700', color: '#d97706', textDecorationLine: 'underline' },
    list: { paddingVertical: 8 },
    emptyContainer: { flex: 1 },
    separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 64 },
    row: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    },
    rowUnread: { backgroundColor: '#fffbeb' },
    iconWrap: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
        marginRight: 12, marginTop: 2,
    },
    icon: { fontSize: 18 },
    rowBody: { flex: 1, gap: 3 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
    rowBodyText: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
    rowTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
    arrow: { fontSize: 20, color: '#9ca3af', marginLeft: 8, alignSelf: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
    emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});

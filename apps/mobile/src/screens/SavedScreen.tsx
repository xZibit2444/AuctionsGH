import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Image, RefreshControl, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
    session: Session;
    onSelectAuction: (id: string) => void;
    onBack: () => void;
}

type SavedAuction = {
    id: string;
    title: string;
    current_price: number;
    status: string;
    ends_at: string;
    auction_images: { url: string }[];
};

const GHS = (n: number) => `GH₵ ${n.toLocaleString()}`;

export default function SavedScreen({ session, onSelectAuction, onBack }: Props) {
    const [items, setItems] = useState<SavedAuction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('saved_auctions') as any)
            .select('auction:auctions(id, title, current_price, status, ends_at, auction_images(url))')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        const rows = (data ?? []) as { auction: SavedAuction }[];
        setItems(rows.map(r => r.auction).filter(Boolean));
        setLoading(false);
    }, [session.user.id]);

    useEffect(() => { void load(); }, [load]);

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const removeSaved = async (auctionId: string) => {
        setRemovingId(auctionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('saved_auctions') as any)
            .delete()
            .eq('user_id', session.user.id)
            .eq('auction_id', auctionId);
        setItems(prev => prev.filter(a => a.id !== auctionId));
        setRemovingId(null);
    };

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Saved</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading
                ? <View style={styles.centered}><ActivityIndicator size="large" /></View>
                : <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                    {items.length === 0
                        ? <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🔖</Text>
                            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                            <Text style={styles.emptyBody}>Tap the bookmark icon on any auction to save it here.</Text>
                        </View>
                        : items.map(a => {
                            const img = a.auction_images?.[0]?.url;
                            const isActive = a.status === 'active';
                            return (
                                <TouchableOpacity key={a.id} style={styles.row} onPress={() => onSelectAuction(a.id)}>
                                    {img
                                        ? <Image source={{ uri: img }} style={styles.thumb} />
                                        : <View style={[styles.thumb, styles.thumbPlaceholder]} />
                                    }
                                    <View style={styles.info}>
                                        <Text style={styles.itemTitle} numberOfLines={1}>{a.title}</Text>
                                        <Text style={styles.price}>{GHS(a.current_price)}</Text>
                                        <View style={[styles.badge, isActive ? styles.badgeGreen : styles.badgeGray]}>
                                            <Text style={styles.badgeText}>{a.status.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => void removeSaved(a.id)}
                                        disabled={removingId === a.id}
                                    >
                                        <Text style={styles.removeText}>{removingId === a.id ? '…' : '🗑'}</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })
                    }
                </ScrollView>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { width: 40 },
    backText: { fontSize: 20, color: '#000' },
    title: { fontSize: 18, fontWeight: '900', color: '#000' },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', padding: 12, gap: 12 },
    thumb: { width: 64, height: 64 },
    thumbPlaceholder: { backgroundColor: '#e5e7eb' },
    info: { flex: 1, gap: 3 },
    itemTitle: { fontSize: 14, fontWeight: '700', color: '#000' },
    price: { fontSize: 15, fontWeight: '900', color: '#000' },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2 },
    badgeGreen: { backgroundColor: '#10b981' },
    badgeGray: { backgroundColor: '#9ca3af' },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    removeBtn: { padding: 8 },
    removeText: { fontSize: 18 },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#000' },
    emptyBody: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});

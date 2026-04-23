import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Image, RefreshControl, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
    sellerId: string;
    session: Session;
    onBack: () => void;
    onSelectAuction: (id: string) => void;
}

type SellerInfo = {
    id: string;
    full_name: string | null;
    username: string | null;
    location: string | null;
    is_verified: boolean;
    created_at: string;
    avatar_url: string | null;
};

type SellerListing = {
    id: string;
    title: string;
    brand: string | null;
    condition: string | null;
    current_price: number;
    status: string;
    created_at: string;
    auction_images: { url: string; position: number }[];
};

type SellerReview = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: { full_name: string | null; username: string | null } | null;
};

const GHS = (n: number) => `GH₵ ${n.toLocaleString()}`;

function Stars({ rating }: { rating: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Text key={i} style={{ color: i < Math.round(rating) ? '#f59e0b' : '#d1d5db', fontSize: 14 }}>★</Text>
            ))}
        </View>
    );
}

export default function SellerProfileScreen({ sellerId, session: _session, onBack, onSelectAuction }: Props) {
    const [seller, setSeller] = useState<SellerInfo | null>(null);
    const [listings, setListings] = useState<SellerListing[]>([]);
    const [reviews, setReviews] = useState<SellerReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'listings' | 'history' | 'reviews'>('listings');

    const load = useCallback(async () => {
        const [sellerRes, listingsRes, reviewsRes] = await Promise.all([
            supabase.from('profiles').select('id, full_name, username, location, is_verified, created_at, avatar_url').eq('id', sellerId).maybeSingle(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('auctions') as any).select('id, title, brand, condition, current_price, status, created_at, auction_images(url, position)').eq('seller_id', sellerId).order('created_at', { ascending: false }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('user_reviews') as any).select('id, rating, comment, created_at, reviewer:profiles!reviewer_id(full_name, username)').eq('reviewee_id', sellerId).order('created_at', { ascending: false }),
        ]);
        setSeller(sellerRes.data as SellerInfo | null);
        setListings((listingsRes.data ?? []) as SellerListing[]);
        setReviews(((reviewsRes.data ?? []) as SellerReview[]).filter(r => r.comment?.trim()));
        setLoading(false);
    }, [sellerId]);

    useEffect(() => { void load(); }, [load]);

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const activeListings = listings.filter(l => l.status === 'active');
    const history = listings.filter(l => l.status !== 'active');
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const sellerName = seller?.full_name ?? seller?.username ?? 'Seller';

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
    if (!seller) return (
        <View style={styles.centered}>
            <Text style={styles.notFound}>Seller not found.</Text>
            <TouchableOpacity onPress={onBack}><Text style={styles.link}>Go Back</Text></TouchableOpacity>
        </View>
    );

    const tabData = tab === 'listings' ? activeListings : tab === 'history' ? history : reviews;

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{sellerName}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.avatarCircle}>
                        {seller.avatar_url
                            ? <Image source={{ uri: seller.avatar_url }} style={styles.avatarImg} />
                            : <Text style={styles.avatarInitial}>{sellerName[0]?.toUpperCase()}</Text>
                        }
                    </View>
                    <View style={styles.heroInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.sellerName}>{sellerName}</Text>
                            {seller.is_verified && (
                                <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
                            )}
                        </View>
                        {seller.location && <Text style={styles.heroMeta}>📍 {seller.location}</Text>}
                        <Text style={styles.heroMeta}>
                            Selling since {new Date(seller.created_at).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{activeListings.length}</Text>
                        <Text style={styles.statLbl}>Active</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{listings.length}</Text>
                        <Text style={styles.statLbl}>Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{reviews.length}</Text>
                        <Text style={styles.statLbl}>Reviews</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statVal}>{avgRating?.toFixed(1) ?? '—'}</Text>
                        <Text style={styles.statLbl}>Rating</Text>
                    </View>
                </View>

                {/* Tab bar */}
                <View style={styles.tabRow}>
                    {(['listings', 'history', 'reviews'] as const).map(t => (
                        <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                                {t === 'listings' ? `Active (${activeListings.length})` : t === 'history' ? `History (${history.length})` : `Reviews (${reviews.length})`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Content */}
                {tabData.length === 0
                    ? <Text style={styles.empty}>{tab === 'listings' ? 'No active listings.' : tab === 'history' ? 'No listing history.' : 'No reviews yet.'}</Text>
                    : tab === 'reviews'
                        ? (reviews as SellerReview[]).map(r => (
                            <View key={r.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewerName}>{r.reviewer?.full_name ?? r.reviewer?.username ?? 'Buyer'}</Text>
                                    <Stars rating={r.rating} />
                                </View>
                                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                                <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString('en-GH')}</Text>
                            </View>
                        ))
                        : (tabData as SellerListing[]).map(a => {
                            const img = [...(a.auction_images ?? [])].sort((x, y) => x.position - y.position)[0]?.url;
                            const statusColor = a.status === 'active' ? '#10b981' : a.status === 'sold' ? '#f59e0b' : '#9ca3af';
                            return (
                                <TouchableOpacity key={a.id} style={styles.listingRow} onPress={() => onSelectAuction(a.id)}>
                                    {img
                                        ? <Image source={{ uri: img }} style={styles.listingThumb} />
                                        : <View style={[styles.listingThumb, styles.thumbPlaceholder]} />
                                    }
                                    <View style={styles.listingInfo}>
                                        <Text style={styles.listingTitle} numberOfLines={2}>{a.title}</Text>
                                        <Text style={styles.listingMeta}>{a.brand}{a.condition ? ` · ${a.condition.replace(/_/g, ' ')}` : ''}</Text>
                                        <Text style={styles.listingPrice}>{GHS(a.current_price)}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                                        <Text style={styles.statusText}>{a.status.toUpperCase()}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                }
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFound: { fontSize: 15, color: '#dc2626', fontWeight: '700' },
    link: { fontSize: 14, fontWeight: '700', color: '#000', textDecorationLine: 'underline' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { width: 40 },
    backText: { fontSize: 20, color: '#000' },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: '#000', textAlign: 'center' },
    hero: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 14 },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: 64, height: 64 },
    avatarInitial: { color: '#fff', fontSize: 26, fontWeight: '900' },
    heroInfo: { flex: 1, gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    sellerName: { fontSize: 18, fontWeight: '900', color: '#000' },
    verifiedBadge: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#6ee7b7', paddingHorizontal: 6, paddingVertical: 2 },
    verifiedText: { fontSize: 9, fontWeight: '900', color: '#059669' },
    heroMeta: { fontSize: 12, color: '#6b7280' },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    statCard: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f3f4f6' },
    statVal: { fontSize: 20, fontWeight: '900', color: '#000' },
    statLbl: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
    tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#000' },
    tabText: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
    tabTextActive: { color: '#000' },
    empty: { textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 32 },
    listingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', padding: 12, gap: 12 },
    listingThumb: { width: 72, height: 72 },
    thumbPlaceholder: { backgroundColor: '#e5e7eb' },
    listingInfo: { flex: 1, gap: 3 },
    listingTitle: { fontSize: 14, fontWeight: '700', color: '#000' },
    listingMeta: { fontSize: 11, color: '#6b7280' },
    listingPrice: { fontSize: 15, fontWeight: '900', color: '#000' },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'center' },
    statusText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    reviewCard: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', padding: 14, gap: 6 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewerName: { fontSize: 13, fontWeight: '700', color: '#000' },
    reviewComment: { fontSize: 13, color: '#374151', lineHeight: 20 },
    reviewDate: { fontSize: 11, color: '#9ca3af' },
});

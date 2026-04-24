import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
    fetchActiveAuctions, fetchMobileProfile,
    type AuctionFetchParams, type MobileAuctionListItem, type MobileProfile,
} from '../features/home/data';

const CATEGORIES = ['All', 'Phones & Tablets', 'Laptops & Computers', 'Audio & Headphones', 'Cameras', 'TVs & Displays', 'Gaming', 'Home Appliances', 'Other Electronics'];
const SORT_OPTIONS: { label: string; value: AuctionFetchParams['sort'] }[] = [
    { label: 'Ending Soon', value: 'ends_at:asc' },
    { label: 'Newest', value: 'created_at:desc' },
    { label: 'Price ↑', value: 'current_price:asc' },
    { label: 'Price ↓', value: 'current_price:desc' },
];

type ListingTab = 'timed' | 'permanent';

const GHS = (n: number) => `GH₵ ${n.toLocaleString()}`;

interface Props {
    session: Session;
    onSelectAuction: (id: string) => void;
    onOpenProfile: () => void;
    onSignOut: () => void;
}

export default function HomeScreen({ session, onSelectAuction, onOpenProfile }: Props) {
    const [profile, setProfile] = useState<MobileProfile | null>(null);
    const [auctions, setAuctions] = useState<MobileAuctionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [tab, setTab] = useState<ListingTab>('timed');
    const [search, setSearch] = useState('');
    const [inputVal, setInputVal] = useState('');
    const [brand, setBrand] = useState('All');
    const [sort, setSort] = useState<AuctionFetchParams['sort']>('ends_at:asc');
    const [showSort, setShowSort] = useState(false);

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [p, a] = await Promise.all([
                fetchMobileProfile(session.user.id),
                fetchActiveAuctions({ listingType: tab, search: search || undefined, brand, sort }),
            ]);
            if (p?.is_banned) { await supabase.auth.signOut(); return; }
            setProfile(p);
            setAuctions(a);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session.user.id, tab, search, brand, sort]);

    useEffect(() => { void loadData(); }, [loadData]);

    // Realtime price/status updates
    useEffect(() => {
        channelRef.current = supabase
            .channel('home:auctions')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, (payload) => {
                const next = payload.new as { id: string; current_price: number; bid_count: number; status: string; ends_at: string };
                setAuctions(prev => prev.map(a =>
                    a.id === next.id
                        ? { ...a, current_price: next.current_price, bid_count: next.bid_count, status: next.status, ends_at: next.ends_at }
                        : a
                ));
            })
            .subscribe();
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, []);

    const submitSearch = () => { setSearch(inputVal); };
    const clearFilters = () => { setInputVal(''); setSearch(''); setBrand('All'); setSort('ends_at:asc'); };
    const hasFilters = search || brand !== 'All';

    const isPermanent = (a: MobileAuctionListItem) => new Date(a.ends_at) > new Date('2090-01-01');

    const renderItem = ({ item }: { item: MobileAuctionListItem }) => {
        const img = item.auction_images?.[0]?.url;
        const endsAt = new Date(item.ends_at);
        const isPermListing = isPermanent(item);
        const timeLeft = !isPermListing ? formatTimeLeft(endsAt) : null;

        return (
            <TouchableOpacity style={styles.card} onPress={() => onSelectAuction(item.id)}>
                {img
                    ? <Image source={{ uri: img }} style={styles.cardImg} resizeMode="cover" />
                    : <View style={styles.cardImgPlaceholder} />
                }
                <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    {(item.brand || item.model) && (
                        <Text style={styles.cardMeta}>{[item.brand, item.model].filter(Boolean).join(' · ')}</Text>
                    )}
                    <Text style={styles.cardPrice}>{GHS(item.current_price)}</Text>
                    <View style={styles.cardRow}>
                        <Text style={styles.cardMeta}>{item.bid_count} bid{item.bid_count !== 1 ? 's' : ''}</Text>
                        {timeLeft
                            ? <Text style={[styles.cardMeta, styles.timeLeft]}>{timeLeft}</Text>
                            : <View style={styles.buyNowBadge}><Text style={styles.buyNowText}>BUY NOW</Text></View>
                        }
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                <TouchableOpacity onPress={onOpenProfile} style={styles.profileBtn}>
                    <Ionicons name="person-circle-outline" size={22} color="#374151" />
                    <Text style={styles.profileBtnText}>
                        {profile?.full_name?.split(' ')[0] ?? profile?.username ?? 'Profile'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tab, tab === 'timed' && styles.tabActive]} onPress={() => setTab('timed')}>
                    <Ionicons name={tab === 'timed' ? 'hammer' : 'hammer-outline'} size={15} color={tab === 'timed' ? '#000' : '#9ca3af'} />
                    <Text style={[styles.tabText, tab === 'timed' && styles.tabTextActive]}>Auctions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'permanent' && styles.tabActive]} onPress={() => setTab('permanent')}>
                    <Ionicons name={tab === 'permanent' ? 'pricetag' : 'pricetag-outline'} size={15} color={tab === 'permanent' ? '#000' : '#9ca3af'} />
                    <Text style={[styles.tabText, tab === 'permanent' && styles.tabTextActive]}>Buy Now</Text>
                </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        value={inputVal}
                        onChangeText={setInputVal}
                        onSubmitEditing={submitSearch}
                        placeholder="Search items…"
                        placeholderTextColor="#9ca3af"
                        returnKeyType="search"
                    />
                    {inputVal ? (
                        <TouchableOpacity onPress={() => { setInputVal(''); setSearch(''); }}>
                            <Ionicons name="close-circle" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(s => !s)}>
                    <Ionicons name="swap-vertical" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Sort dropdown */}
            {showSort && (
                <View style={styles.sortDropdown}>
                    {SORT_OPTIONS.map(o => (
                        <TouchableOpacity key={o.value} style={[styles.sortOption, sort === o.value && styles.sortOptionActive]} onPress={() => { setSort(o.value); setShowSort(false); }}>
                            <Text style={[styles.sortOptionText, sort === o.value && styles.sortOptionTextActive]}>{o.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContent}>
                {CATEGORIES.map(c => (
                    <TouchableOpacity key={c} style={[styles.chip, brand === c && styles.chipActive]} onPress={() => setBrand(c)}>
                        <Text style={[styles.chipText, brand === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Clear filters */}
            {hasFilters && (
                <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
                    <Ionicons name="close-circle-outline" size={13} color="#6b7280" />
                    <Text style={styles.clearFiltersText}> Clear filters</Text>
                </TouchableOpacity>
            )}

            {/* List */}
            {loading
                ? <View style={styles.centered}><ActivityIndicator size="large" /></View>
                : <FlatList
                    data={auctions}
                    keyExtractor={i => i.id}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadData(true); }} />}
                    ListEmptyComponent={<Text style={styles.empty}>{search ? `No results for "${search}".` : tab === 'permanent' ? 'No buy-now listings yet.' : 'No active auctions right now.'}</Text>}
                />
            }
        </SafeAreaView>
    );
}

function formatTimeLeft(endsAt: Date): string {
    const diff = endsAt.getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 48) return `${Math.floor(h / 24)}d left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
    logo: { height: 36, width: 130 },
    profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
    profileBtnText: { fontSize: 13, fontWeight: '600', color: '#111827' },
    tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#000' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
    tabTextActive: { color: '#000' },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 7, gap: 6, backgroundColor: '#f9fafb' },
    searchInput: { flex: 1, fontSize: 14, color: '#000', padding: 0 },
    sortBtn: { width: 40, height: 40, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    sortDropdown: { position: 'absolute', top: 145, right: 10, zIndex: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 6 },
    sortOption: { paddingHorizontal: 20, paddingVertical: 12 },
    sortOptionActive: { backgroundColor: '#f3f4f6' },
    sortOptionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    sortOptionTextActive: { color: '#000', fontWeight: '900' },
    chipScroll: { backgroundColor: '#fff', maxHeight: 46 },
    chipContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 6, flexDirection: 'row' },
    chip: { paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
    chipActive: { backgroundColor: '#000', borderColor: '#000' },
    chipText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    chipTextActive: { color: '#fff' },
    clearFilters: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    clearFiltersText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
    list: { padding: 8, paddingBottom: 32 },
    columnWrapper: { gap: 8, marginBottom: 8 },
    card: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
    cardImg: { width: '100%', height: 130 },
    cardImgPlaceholder: { width: '100%', height: 130, backgroundColor: '#f3f4f6' },
    cardBody: { padding: 10, gap: 3 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#000' },
    cardMeta: { fontSize: 11, color: '#6b7280' },
    cardPrice: { fontSize: 15, fontWeight: '900', color: '#000', marginVertical: 2 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
    timeLeft: { color: '#f59e0b', fontWeight: '700' },
    buyNowBadge: { backgroundColor: '#10b981', paddingHorizontal: 5, paddingVertical: 2 },
    buyNowText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 60, paddingHorizontal: 32 },
});

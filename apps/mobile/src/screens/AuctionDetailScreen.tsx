import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
    fetchAuctionDetail, fetchMobileOffers, placeMobileBid, placeMobileOffer,
    type MobileAuctionDetail, type MobileOffer,
} from '../features/home/data';

type OfferStatus = 'pending' | 'accepted' | 'declined';

interface Props {
    session: Session;
    auctionId: string;
    onBack: () => void;
    onOpenChat: (auctionId: string, auctionTitle: string, sellerId: string, buyerId: string, offerId: string, offerStatus: OfferStatus) => void;
    onOpenSellerProfile?: (sellerId: string) => void;
}

export default function AuctionDetailScreen({ session, auctionId, onBack, onOpenChat, onOpenSellerProfile }: Props) {
    const [detail, setDetail] = useState<MobileAuctionDetail | null>(null);
    const [offers, setOffers] = useState<MobileOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [bidAmount, setBidAmount] = useState('');
    const [offerAmount, setOfferAmount] = useState('');
    const [placingBid, setPlacingBid] = useState(false);
    const [sendingOffer, setSendingOffer] = useState(false);
    const [saved, setSaved] = useState(false);
    const [savingToggle, setSavingToggle] = useState(false);

    const token = session.access_token;
    const userId = session.user.id;

    const checkSaved = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('saved_auctions') as any)
            .select('id').eq('user_id', userId).eq('auction_id', auctionId).maybeSingle();
        setSaved(!!data);
    };

    const toggleSave = async () => {
        if (savingToggle) return;
        setSavingToggle(true);
        if (saved) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('saved_auctions') as any).delete().eq('user_id', userId).eq('auction_id', auctionId);
            setSaved(false);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('saved_auctions') as any).insert({ user_id: userId, auction_id: auctionId });
            setSaved(true);
        }
        setSavingToggle(false);
    };

    const load = async () => {
        setLoading(true);
        try {
            const [d, o] = await Promise.all([
                fetchAuctionDetail(auctionId),
                fetchMobileOffers(auctionId, token),
            ]);
            setDetail(d);
            setOffers(o);
            if (d) {
                setBidAmount((d.current_price + d.min_increment).toFixed(2));
                setOfferAmount(d.current_price.toFixed(2));
            }
        } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); void checkSaved(); }, [auctionId]);

    const handleBid = async () => {
        if (!detail) return;
        const amount = parseFloat(bidAmount);
        const min = detail.current_price + detail.min_increment;
        if (!isFinite(amount) || amount < min) {
            Alert.alert('Invalid bid', `Minimum bid is GHS ${min.toLocaleString()}.`);
            return;
        }
        setPlacingBid(true);
        try {
            await placeMobileBid(detail.id, amount);
            await load();
            Alert.alert('Bid placed', 'Your bid was submitted.');
        } catch (e) {
            Alert.alert('Bid failed', e instanceof Error ? e.message : 'Try again.');
        } finally {
            setPlacingBid(false);
        }
    };

    const handleOffer = async () => {
        if (!detail) return;
        const amount = parseFloat(offerAmount);
        if (!isFinite(amount) || amount <= 0) {
            Alert.alert('Invalid offer', 'Enter a valid offer amount.');
            return;
        }
        setSendingOffer(true);
        try {
            await placeMobileOffer(detail.id, amount, token);
            const refreshed = await fetchMobileOffers(detail.id, token);
            setOffers(refreshed);
            Alert.alert('Offer sent', 'The seller will be notified.');
        } catch (e) {
            Alert.alert('Offer failed', e instanceof Error ? e.message : 'Try again.');
        } finally {
            setSendingOffer(false);
        }
    };

    if (loading) return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" /></SafeAreaView>;
    if (!detail) return <SafeAreaView style={styles.centered}><Text style={styles.meta}>Auction not found.</Text></SafeAreaView>;

    const isSeller = detail.seller_id === userId;
    const isActive = detail.status === 'active';
    const seller = detail.profiles;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleSave} style={styles.saveBtn} disabled={savingToggle}>
                    <Text style={styles.saveBtnText}>{saved ? '🔖 Saved' : '🔖 Save'}</Text>
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.title}>{detail.title}</Text>
                    {(detail.brand || detail.model) && (
                        <Text style={styles.meta}>{[detail.brand, detail.model].filter(Boolean).join(' ')}</Text>
                    )}
                    <Text style={styles.price}>GHS {Number(detail.current_price).toLocaleString()}</Text>
                    <View style={styles.row}>
                        <Text style={styles.meta}>{detail.bid_count} bid{detail.bid_count !== 1 ? 's' : ''}</Text>
                        <Text style={styles.meta}>Ends {new Date(detail.ends_at).toLocaleString()}</Text>
                    </View>
                    {seller && (
                        <TouchableOpacity onPress={() => onOpenSellerProfile?.(detail.seller_id)} disabled={!onOpenSellerProfile}>
                            <Text style={[styles.meta, onOpenSellerProfile && styles.sellerLink]}>
                                Seller: {seller.full_name ?? seller.username ?? 'Unknown'}
                                {seller.location ? ` · ${seller.location}` : ''}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {detail.condition && <Text style={styles.meta}>Condition: {detail.condition}</Text>}
                    {detail.description ? (
                        <Text style={styles.description}>{detail.description}</Text>
                    ) : null}

                    {detail.auction_images.map((img, i) => (
                        <Image key={i} source={{ uri: img.url }} style={styles.image} resizeMode="cover" />
                    ))}

                    {/* Bid panel — buyers only, active only */}
                    {!isSeller && isActive && (
                        <View style={styles.panel}>
                            <Text style={styles.panelLabel}>Place a Bid</Text>
                            <Text style={styles.meta}>Min increment: GHS {Number(detail.min_increment).toLocaleString()}</Text>
                            <TextInput
                                style={styles.input} keyboardType="numeric"
                                value={bidAmount} onChangeText={setBidAmount} placeholderTextColor="#9ca3af"
                            />
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleBid} disabled={placingBid}>
                                <Text style={styles.primaryBtnText}>{placingBid ? 'Placing…' : 'Place Bid'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Offer panel — buyers only */}
                    {!isSeller && (
                        <View style={styles.panel}>
                            <Text style={styles.panelLabel}>Offers</Text>
                            {isActive && (
                                <>
                                    <TextInput
                                        style={styles.input} keyboardType="numeric"
                                        value={offerAmount} onChangeText={setOfferAmount} placeholderTextColor="#9ca3af"
                                    />
                                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleOffer} disabled={sendingOffer}>
                                        <Text style={styles.secondaryBtnText}>{sendingOffer ? 'Sending…' : 'Send Offer'}</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            {offers.map(o => (
                                <TouchableOpacity
                                    key={o.id}
                                    style={styles.offerRow}
                                    onPress={() => onOpenChat(detail.id, detail.title, detail.seller_id, userId, o.id, o.status)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.offerAmount}>GHS {Number(o.amount).toLocaleString()}</Text>
                                        <Text style={styles.meta}>{new Date(o.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={[styles.offerStatus, {
                                        color: o.status === 'accepted' ? '#16a34a' : o.status === 'declined' ? '#dc2626' : '#d97706',
                                    }]}>{o.status.toUpperCase()}</Text>
                                    <Text style={styles.chatLink}>Chat →</Text>
                                </TouchableOpacity>
                            ))}
                            {offers.length === 0 && !isActive && (
                                <Text style={styles.meta}>No offers.</Text>
                            )}
                        </View>
                    )}

                    {/* Seller: all buyer offers */}
                    {isSeller && offers.length > 0 && (
                        <View style={styles.panel}>
                            <Text style={styles.panelLabel}>Offers from Buyers</Text>
                            {offers.map(o => (
                                <TouchableOpacity
                                    key={o.id}
                                    style={styles.offerRow}
                                    onPress={() => onOpenChat(detail.id, detail.title, detail.seller_id, o.buyer_id, o.id, o.status)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.offerAmount}>GHS {Number(o.amount).toLocaleString()}</Text>
                                        <Text style={styles.meta}>{new Date(o.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={[styles.offerStatus, {
                                        color: o.status === 'accepted' ? '#16a34a' : o.status === 'declined' ? '#dc2626' : '#d97706',
                                    }]}>{o.status.toUpperCase()}</Text>
                                    <Text style={styles.chatLink}>Chat →</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
    content: { padding: 16, gap: 10, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: '700', color: '#111827' },
    meta: { fontSize: 13, color: '#6b7280' },
    price: { fontSize: 22, fontWeight: '700', color: '#111827' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    description: { fontSize: 14, color: '#374151', lineHeight: 20 },
    image: { width: '100%', height: 220, borderRadius: 10, backgroundColor: '#e5e7eb' },
    panel: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
    panelLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
    input: {
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827',
    },
    primaryBtn: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    secondaryBtn: { borderWidth: 1, borderColor: '#111827', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    secondaryBtnText: { color: '#111827', fontWeight: '600', fontSize: 14 },
    offerRow: {
        flexDirection: 'row', alignItems: 'center', padding: 10,
        borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', gap: 8,
    },
    offerAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
    offerStatus: { fontSize: 11, fontWeight: '700' },
    chatLink: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
    saveBtn: { paddingHorizontal: 12, paddingVertical: 10 },
    saveBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
    sellerLink: { color: '#6366f1', textDecorationLine: 'underline' },
});

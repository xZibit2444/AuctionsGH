import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParams } from '../navigation/types';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<DashboardStackParams, 'Checkout'> & { session: Session };

const GHS = (n: number) => `GH₵ ${n.toLocaleString()}`;

export default function CheckoutScreen({ navigation, route, session }: Props) {
    const { auctionId } = route.params;

    const [auction, setAuction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        delivery: 'pickup' as 'pickup' | 'delivery',
        address: '',
    });

    useEffect(() => {
        void (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from('auctions') as any)
                .select('id, title, current_price, status, winner_id, ends_at, listing_city, meetup_area, delivery_available, auction_images(url)')
                .eq('id', auctionId)
                .maybeSingle();
            setAuction(data);
            setLoading(false);
        })();
    }, [auctionId]);

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

    if (!auction) return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>Auction not found.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Go Back</Text></TouchableOpacity>
        </View>
    );

    if (auction.status !== 'sold' || auction.winner_id !== session.user.id) return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>You are not the winner of this auction.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Go Back</Text></TouchableOpacity>
        </View>
    );

    const endsAt = auction.ends_at ? new Date(auction.ends_at).getTime() : 0;
    const isExpired = endsAt > 0 && (Date.now() - endsAt > 30 * 60 * 1000);
    if (isExpired) return (
        <View style={styles.centered}>
            <Text style={styles.errorTitle}>Checkout Window Closed</Text>
            <Text style={styles.errorSub}>The 30-minute window has passed. This bid is void.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Go Back</Text></TouchableOpacity>
        </View>
    );

    const handleSubmit = async () => {
        if (!form.name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
        if (!form.phone.trim()) { Alert.alert('Required', 'Please enter your phone number.'); return; }
        if (form.delivery === 'delivery' && !form.address.trim()) { Alert.alert('Required', 'Please enter a delivery address.'); return; }

        setProcessing(true);
        setError('');
        try {
            const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    auctionId: auction.id,
                    buyerId: session.user.id,
                    deliveryMethod: form.delivery,
                    amount: auction.current_price,
                    address: form.address,
                    phone: form.phone,
                    name: form.name,
                }),
            });
            const json = await res.json() as { success?: boolean; orderId?: string; error?: string };
            if (json.success && json.orderId) {
                Alert.alert('Order Confirmed!', 'Your order has been placed. The seller will contact you shortly.', [
                    { text: 'View Order', onPress: () => navigation.navigate('Orders') },
                ]);
            } else {
                setError(json.error ?? 'Failed to confirm order.');
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Network error. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                {/* Auction summary */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>You Won</Text>
                    <Text style={styles.auctionTitle}>{auction.title}</Text>
                    <Text style={styles.price}>{GHS(auction.current_price)}</Text>
                    <Text style={styles.meta}>Meetup: {auction.listing_city}{auction.meetup_area ? `, ${auction.meetup_area}` : ''}</Text>
                </View>

                {error ? <View style={styles.errorBox}><Text style={styles.errorBoxText}>{error}</Text></View> : null}

                {/* Fulfilment method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fulfilment Method</Text>
                    <View style={styles.chipRow}>
                        {(['pickup', ...(auction.delivery_available ? ['delivery'] : [])] as ('pickup' | 'delivery')[]).map(v => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.chip, form.delivery === v && styles.chipActive]}
                                onPress={() => setForm(f => ({ ...f, delivery: v }))}
                            >
                                <Text style={[styles.chipText, form.delivery === v && styles.chipTextActive]}>
                                    {v === 'pickup' ? '🤝 Pickup / Meet' : '🚚 Delivery'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Contact info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Details</Text>
                    <View style={styles.field}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Your name" placeholderTextColor="#9ca3af" />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput style={styles.input} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="+233 XX XXX XXXX" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                    </View>
                    {form.delivery === 'delivery' && (
                        <View style={styles.field}>
                            <Text style={styles.label}>Delivery Address</Text>
                            <TextInput style={[styles.input, styles.textarea]} value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Your full delivery address" placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" />
                        </View>
                    )}
                </View>

                {/* Pay on delivery notice */}
                <View style={styles.notice}>
                    <Text style={styles.noticeTitle}>Pay on Delivery / Meetup</Text>
                    <Text style={styles.noticeBody}>You confirm the order now, then pay the seller when the item is delivered or at meetup. Always inspect the item before handing over payment.</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{GHS(auction.current_price)}</Text>
                </View>
                <TouchableOpacity style={[styles.confirmBtn, processing && styles.btnDisabled]} onPress={handleSubmit} disabled={processing}>
                    {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm Order</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { width: 40, paddingRight: 8 },
    backText: { fontSize: 20, color: '#000' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: '#000' },
    body: { flex: 1 },
    card: { backgroundColor: '#fff', margin: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
    cardLabel: { fontSize: 10, fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    auctionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
    price: { fontSize: 24, fontWeight: '900', color: '#000', marginBottom: 4 },
    meta: { fontSize: 12, color: '#6b7280' },
    errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', margin: 16, padding: 12 },
    errorBoxText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
    section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
    chipActive: { backgroundColor: '#000', borderColor: '#000' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    chipTextActive: { color: '#fff' },
    field: { marginBottom: 12 },
    label: { fontSize: 10, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#000' },
    textarea: { height: 80, paddingTop: 10 },
    notice: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', margin: 16, padding: 14 },
    noticeTitle: { fontSize: 12, fontWeight: '900', color: '#92400e', marginBottom: 6 },
    noticeBody: { fontSize: 12, color: '#78350f', lineHeight: 18 },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
    totalValue: { fontSize: 20, fontWeight: '900', color: '#000' },
    confirmBtn: { backgroundColor: '#000', paddingVertical: 14, alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    confirmText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    errorTitle: { fontSize: 20, fontWeight: '900', color: '#000', marginBottom: 8, textAlign: 'center' },
    errorSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
    errorText: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
    link: { fontSize: 14, fontWeight: '700', color: '#000', textDecorationLine: 'underline' },
});

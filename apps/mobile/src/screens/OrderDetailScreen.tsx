import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
    Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
    orderId: string;
    session: Session;
    onBack: () => void;
}

type OrderMessage = {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
};

type OrderDetail = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: string;
    fulfillment_type: string;
    meetup_location: string | null;
    created_at: string;
    auction: { id: string; title: string; current_price: number } | null;
    buyer: { id: string; full_name: string | null; username: string | null } | null;
    seller: { id: string; full_name: string | null; username: string | null } | null;
};

const GHS = (n: number) => `GH₵ ${n.toLocaleString()}`;

const STATUS_COLORS: Record<string, string> = {
    pending_meetup: '#f59e0b',
    completed: '#10b981',
    pin_verified: '#10b981',
    ghosted: '#ef4444',
    pending_payment: '#6366f1',
    funds_held: '#6366f1',
    in_delivery: '#3b82f6',
    pin_refused: '#ef4444',
    returning: '#f97316',
    refunded: '#9ca3af',
};

function statusLabel(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function OrderDetailScreen({ orderId, session, onBack }: Props) {
    const userId = session.user.id;
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [messages, setMessages] = useState<OrderMessage[]>([]);
    const [loadingOrder, setLoadingOrder] = useState(true);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const flatRef = useRef<FlatList>(null);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [confirmingPin, setConfirmingPin] = useState(false);
    const [markingSent, setMarkingSent] = useState(false);

    const loadDelivery = useCallback(async () => {
        const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
        try {
            const res = await fetch(`${API_BASE}/api/delivery/${orderId}?by=order`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const json = await res.json() as { delivery?: { delivery_code?: string } };
                setDeliveryCode(json.delivery?.delivery_code ?? null);
            }
        } catch { /* silent */ }
    }, [orderId, session.access_token]);

    const loadOrder = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('orders') as any)
            .select(`
                id, auction_id, buyer_id, seller_id, amount, status,
                fulfillment_type, meetup_location, created_at,
                auction:auctions(id, title, current_price),
                buyer:profiles!orders_buyer_id_fkey(id, full_name, username),
                seller:profiles!orders_seller_id_fkey(id, full_name, username)
            `)
            .eq('id', orderId)
            .maybeSingle();
        setOrder(data as OrderDetail | null);
        setLoadingOrder(false);
    }, [orderId]);

    const checkReviewed = useCallback(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('user_reviews') as any)
            .select('id').eq('order_id', orderId).eq('reviewer_id', userId).maybeSingle();
        setHasReviewed(!!data);
    }, [orderId, userId]);

    const loadMessages = useCallback(async () => {
        const { data } = await supabase
            .from('order_messages' as never)
            .select('id, sender_id, body, created_at')
            .eq('order_id' as never, orderId)
            .order('created_at', { ascending: true })
            .limit(200);
        setMessages((data ?? []) as OrderMessage[]);
    }, [orderId]);

    useEffect(() => {
        void loadOrder();
        void loadMessages();
        void checkReviewed();
        void loadDelivery();

        const msgChannel = supabase
            .channel(`order_messages:${orderId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` }, payload => {
                setMessages(prev => [...prev, payload.new as OrderMessage]);
            })
            .subscribe();

        const statusChannel = supabase
            .channel(`order_status:${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, payload => {
                setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<OrderDetail>) } : prev);
            })
            .subscribe();

        return () => {
            void supabase.removeChannel(msgChannel);
            void supabase.removeChannel(statusChannel);
        };
    }, [orderId, loadOrder, loadMessages, checkReviewed, loadDelivery]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const sendMessage = async () => {
        const text = body.trim();
        if (!text || sending) return;
        setSending(true);
        setBody('');
        const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
        try {
            await fetch(`${API_BASE}/api/orders/${orderId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ body: text }),
            });
        } catch {
            setBody(text);
        }
        setSending(false);
    };

    if (loadingOrder) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
    if (!order) return (
        <View style={styles.centered}>
            <Text style={styles.notFoundText}>Order not found.</Text>
            <TouchableOpacity onPress={onBack}><Text style={styles.link}>Go Back</Text></TouchableOpacity>
        </View>
    );

    const otherParty = order.buyer_id === userId ? order.seller : order.buyer;
    const otherName = otherParty?.full_name ?? otherParty?.username ?? 'Other Party';
    const otherPartyId = otherParty?.id ?? '';
    const role = order.buyer_id === userId ? 'Buyer' : 'Seller';
    const statusColor = STATUS_COLORS[order.status] ?? '#9ca3af';
    const isCompleted = order.status === 'completed' || order.status === 'pin_verified';
    const isActive = !isCompleted && order.status !== 'ghosted' && order.status !== 'refunded' && order.status !== 'cancelled';
    const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

    const markAsSent = async () => {
        if (markingSent) return;
        Alert.alert('Mark as Sent', 'Confirm that you have dispatched this item to the buyer?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm', onPress: async () => {
                    setMarkingSent(true);
                    try {
                        const res = await fetch(`${API_BASE}/api/orders/${orderId}/mark-sent`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${session.access_token}` },
                        });
                        const json = await res.json() as { success?: boolean; error?: string };
                        if (res.ok && json.success) {
                            void loadOrder();
                        } else {
                            Alert.alert('Error', json.error ?? 'Failed to mark as sent.');
                        }
                    } catch { Alert.alert('Error', 'Network error.'); }
                    setMarkingSent(false);
                },
            },
        ]);
    };

    const confirmDelivery = async () => {
        const code = pinInput.trim();
        if (code.length !== 6 || confirmingPin) return;
        setConfirmingPin(true);
        try {
            const res = await fetch(`${API_BASE}/api/delivery/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ orderId, code }),
            });
            const json = await res.json() as { success?: boolean; error?: string };
            if (res.ok && json.success) {
                Alert.alert('Delivery Confirmed!', 'The order is now marked as completed.');
                setPinInput('');
                void loadOrder();
            } else {
                Alert.alert('Error', json.error ?? 'Failed to confirm delivery.');
            }
        } catch { Alert.alert('Error', 'Network error.'); }
        setConfirmingPin(false);
    };

    const submitReview = async () => {
        if (!otherPartyId || submittingReview) return;
        setSubmittingReview(true);
        try {
            const res = await fetch(`${API_BASE}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ order_id: orderId, reviewee_id: otherPartyId, rating: reviewRating, comment: reviewComment.trim() || undefined }),
            });
            const json = await res.json() as { success?: boolean; error?: string };
            if (res.ok && json.success) {
                setHasReviewed(true);
                Alert.alert('Review Submitted', 'Thank you for your feedback!');
            } else {
                Alert.alert('Error', json.error ?? 'Failed to submit review.');
            }
        } catch { Alert.alert('Error', 'Network error.'); }
        setSubmittingReview(false);
    };

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{order.auction?.title ?? 'Order'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Order meta */}
            <View style={styles.meta}>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{statusLabel(order.status)}</Text>
                    </View>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Amount</Text>
                    <Text style={styles.metaValue}>{GHS(order.amount)}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Your Role</Text>
                    <Text style={styles.metaValue}>{role}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{role === 'Buyer' ? 'Seller' : 'Buyer'}</Text>
                    <Text style={styles.metaValue}>{otherName}</Text>
                </View>
                {order.meetup_location && (
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Meetup</Text>
                        <Text style={styles.metaValue}>{order.meetup_location}</Text>
                    </View>
                )}
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type</Text>
                    <Text style={styles.metaValue}>{order.fulfillment_type === 'escrow_delivery' ? 'Delivery' : 'Meet & Inspect'}</Text>
                </View>
            </View>

            {/* Buyer: delivery code card */}
            {role === 'Buyer' && isActive && deliveryCode && (
                <View style={styles.codePanel}>
                    <Text style={styles.codePanelTitle}>YOUR DELIVERY CODE</Text>
                    <Text style={styles.codeValue}>{deliveryCode}</Text>
                    <Text style={styles.codeHint}>Show this to the seller only after you have inspected the item and are satisfied.</Text>
                </View>
            )}

            {/* Seller: mark as sent */}
            {role === 'Seller' && order.status === 'pending_meetup' && (
                <TouchableOpacity
                    style={[styles.markSentBtn, markingSent && styles.pinBtnDisabled]}
                    onPress={markAsSent}
                    disabled={markingSent}
                >
                    <Text style={styles.markSentText}>{markingSent ? 'Updating…' : '📦  Mark as Sent'}</Text>
                </TouchableOpacity>
            )}

            {/* Seller: PIN entry to confirm delivery */}
            {role === 'Seller' && isActive && (
                <View style={styles.pinPanel}>
                    <Text style={styles.pinPanelTitle}>CONFIRM DELIVERY</Text>
                    <Text style={styles.pinHint}>Enter the 6-digit code the buyer gives you at handover.</Text>
                    <View style={styles.pinRow}>
                        <TextInput
                            style={styles.pinInput}
                            value={pinInput}
                            onChangeText={t => setPinInput(t.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            placeholderTextColor="#9ca3af"
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                        <TouchableOpacity
                            style={[styles.pinBtn, (pinInput.length !== 6 || confirmingPin) && styles.pinBtnDisabled]}
                            onPress={confirmDelivery}
                            disabled={pinInput.length !== 6 || confirmingPin}
                        >
                            <Text style={styles.pinBtnText}>{confirmingPin ? 'Confirming…' : 'Confirm'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Review form — only for completed orders not yet reviewed */}
            {isCompleted && !hasReviewed && (
                <View style={styles.reviewPanel}>
                    <Text style={styles.reviewTitle}>Rate your experience with {otherName}</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map(n => (
                            <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                                <Text style={[styles.star, reviewRating >= n && styles.starActive]}>★</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={styles.reviewInput}
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        placeholder="Optional comment…"
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity style={[styles.reviewBtn, submittingReview && styles.reviewBtnDisabled]} onPress={submitReview} disabled={submittingReview}>
                        <Text style={styles.reviewBtnText}>{submittingReview ? 'Submitting…' : 'Submit Review'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Chat */}
            <View style={styles.chatHeader}>
                <Text style={styles.chatHeaderText}>Chat with {otherName}</Text>
            </View>

            <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={m => m.id}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                renderItem={({ item: m }) => {
                    const isMine = m.sender_id === userId;
                    return (
                        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{m.body}</Text>
                            <Text style={styles.bubbleTime}>
                                {new Date(m.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyChat}>
                        <Text style={styles.emptyChatText}>No messages yet. Send the first message!</Text>
                    </View>
                }
            />

            {/* Input */}
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={body}
                    onChangeText={setBody}
                    placeholder={`Message ${otherName}…`}
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity style={[styles.sendBtn, (!body.trim() || sending) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!body.trim() || sending}>
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendIcon}>➤</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFoundText: { fontSize: 15, color: '#dc2626', fontWeight: '700' },
    link: { fontSize: 14, color: '#000', fontWeight: '700', textDecorationLine: 'underline' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { width: 40 },
    backText: { fontSize: 20, color: '#000' },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: '#000', textAlign: 'center' },
    meta: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 8 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    metaLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    metaValue: { fontSize: 13, color: '#000', fontWeight: '700' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    chatHeader: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    chatHeaderText: { fontSize: 11, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
    messageList: { flex: 1 },
    messageListContent: { padding: 12, gap: 8 },
    bubble: { maxWidth: '80%', padding: 10, marginBottom: 4 },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#000' },
    bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
    bubbleText: { fontSize: 14 },
    bubbleTextMine: { color: '#fff' },
    bubbleTextOther: { color: '#000' },
    bubbleTime: { fontSize: 10, color: '#9ca3af', marginTop: 3, alignSelf: 'flex-end' },
    emptyChat: { alignItems: 'center', paddingTop: 40 },
    emptyChatText: { fontSize: 13, color: '#9ca3af' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#000', backgroundColor: '#f9fafb' },
    sendBtn: { width: 44, height: 44, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
    sendIcon: { color: '#fff', fontSize: 16 },
    reviewPanel: { backgroundColor: '#fffbeb', borderTopWidth: 1, borderTopColor: '#fde68a', borderBottomWidth: 1, borderBottomColor: '#fde68a', padding: 14, gap: 10 },
    reviewTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
    starsRow: { flexDirection: 'row', gap: 8 },
    star: { fontSize: 28, color: '#d1d5db' },
    starActive: { color: '#f59e0b' },
    reviewInput: { borderWidth: 1, borderColor: '#fde68a', padding: 10, fontSize: 13, color: '#000', backgroundColor: '#fff', minHeight: 60 },
    reviewBtn: { backgroundColor: '#000', paddingVertical: 10, alignItems: 'center' },
    reviewBtnDisabled: { opacity: 0.4 },
    reviewBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    codePanel: { backgroundColor: '#000', margin: 12, padding: 16, alignItems: 'center', gap: 6 },
    codePanelTitle: { fontSize: 10, fontWeight: '900', color: '#9ca3af', letterSpacing: 1.5, textTransform: 'uppercase' },
    codeValue: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 8, fontVariant: ['tabular-nums'] },
    codeHint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
    pinPanel: { backgroundColor: '#fff', margin: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
    pinPanelTitle: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1.5, textTransform: 'uppercase' },
    pinHint: { fontSize: 12, color: '#6b7280' },
    pinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    pinInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 10, fontSize: 22, fontWeight: '900', color: '#000', letterSpacing: 6, textAlign: 'center' },
    pinBtn: { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 12 },
    pinBtnDisabled: { opacity: 0.4 },
    pinBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    markSentBtn: { marginHorizontal: 12, marginTop: 10, backgroundColor: '#1d4ed8', paddingVertical: 13, alignItems: 'center' },
    markSentText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});

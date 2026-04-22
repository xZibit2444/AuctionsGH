import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
    SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchOfferMessages, sendOfferMessage, type MobileOfferMessage } from '../features/home/data';

interface Props {
    session: Session;
    auctionId: string;
    auctionTitle: string;
    sellerId: string;
    buyerId: string;   // the buyer whose thread we are viewing
    onBack: () => void;
}

export default function OfferChatScreen({
    session, auctionId, auctionTitle, sellerId, buyerId, onBack,
}: Props) {
    const [messages, setMessages] = useState<MobileOfferMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const listRef = useRef<FlatList<MobileOfferMessage>>(null);

    const token = session.access_token;
    const userId = session.user.id;
    const isSeller = userId === sellerId;

    const scrollToEnd = () =>
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    // Initial message load
    useEffect(() => {
        const load = async () => {
            try {
                const msgs = await fetchOfferMessages(
                    auctionId, token, isSeller ? buyerId : undefined
                );
                setMessages(msgs);
                scrollToEnd();
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [auctionId, buyerId]);

    // Realtime subscription for new messages in this thread
    useEffect(() => {
        const channelKey = `offer-chat:${auctionId}:${buyerId}`;
        const channel = supabase
            .channel(channelKey)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'auction_offer_messages',
                    filter: `auction_id=eq.${auctionId}`,
                },
                (payload) => {
                    const msg = payload.new as MobileOfferMessage;
                    // Only apply to this specific buyer thread
                    if (msg.buyer_id !== buyerId) return;
                    // Deduplicate — optimistic insert may already be in state
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    scrollToEnd();
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [auctionId, buyerId]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;

        setSending(true);
        setInput('');

        try {
            const { message } = await sendOfferMessage(
                auctionId, text, token, isSeller ? buyerId : undefined
            );
            // Optimistic add (realtime will deduplicate)
            setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
            scrollToEnd();
        } catch {
            setInput(text); // restore text on failure
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: MobileOfferMessage }) => {
        const mine = item.sender_id === userId;
        return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                    {item.body}
                </Text>
                <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{auctionTitle}</Text>
                    <Text style={styles.headerSub}>{isSeller ? 'Chat with buyer' : 'Chat with seller'}</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {loading ? (
                    <View style={styles.centered}><ActivityIndicator size="large" /></View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={m => m.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messageList}
                        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
                            </View>
                        }
                    />
                )}

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Type a message…"
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim() || sending}
                    >
                        {sending
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.sendText}>Send</Text>
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff', gap: 10,
    },
    backBtn: { padding: 4 },
    backText: { fontSize: 22, color: '#6366f1' },
    headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    headerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messageList: { padding: 12, paddingBottom: 8, gap: 8 },
    emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
    emptyText: { color: '#9ca3af', fontSize: 14 },
    bubble: {
        maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
    },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#111827' },
    bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
    bubbleTextMine: { fontSize: 14, lineHeight: 20, color: '#fff' },
    bubbleTextTheirs: { fontSize: 14, lineHeight: 20, color: '#111827' },
    bubbleTime: { fontSize: 10, color: '#6b7280', marginTop: 3, alignSelf: 'flex-end' },
    bubbleTimeMine: { color: 'rgba(255,255,255,0.55)' },
    inputBar: {
        flexDirection: 'row', padding: 10,
        borderTopWidth: 1, borderTopColor: '#e5e7eb',
        backgroundColor: '#fff', gap: 8, alignItems: 'flex-end',
    },
    input: {
        flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 9, fontSize: 14,
        color: '#111827', maxHeight: 100, backgroundColor: '#f9fafb',
    },
    sendBtn: {
        backgroundColor: '#111827', borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#9ca3af' },
    sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

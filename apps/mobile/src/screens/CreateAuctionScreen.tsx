import React, { useState } from 'react';
import {
    ActivityIndicator, Alert, Image, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Session } from '@supabase/supabase-js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParams } from '../navigation/types';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<DashboardStackParams, 'CreateAuction'> & { session: Session };

const CATEGORIES = ['Phones & Tablets', 'Laptops & Computers', 'Audio & Headphones', 'Cameras', 'TVs & Displays', 'Gaming', 'Home Appliances', 'Other Electronics'];
const CONDITIONS = [{ value: 'new', label: 'New' }, { value: 'like_new', label: 'Like New' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }];
const REGIONS = ['Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo', 'Oti', 'Savannah', 'Bono East', 'Ahafo', 'Western North', 'North East'];

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export default function CreateAuctionScreen({ navigation, session }: Props) {
    const [step, setStep] = useState(1);

    // Step 1 — Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [model, setModel] = useState('');
    const [condition, setCondition] = useState('good');
    const [region, setRegion] = useState('Greater Accra');
    const [meetupArea, setMeetupArea] = useState('');
    const [deliveryAvailable, setDeliveryAvailable] = useState(true);

    // Step 2 — Photos
    const [images, setImages] = useState<{ uri: string; base64?: string | null; mimeType?: string }[]>([]);

    // Step 3 — Pricing
    const [startingPrice, setStartingPrice] = useState('');
    const [minIncrement, setMinIncrement] = useState('50');
    const [isPermanent, setIsPermanent] = useState(true);
    const [durationHours, setDurationHours] = useState('72');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.7,
            base64: false,
            selectionLimit: 8 - images.length,
        });
        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.slice(0, 8 - prev.length)]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setError('');
        if (!title.trim()) { setError('Title is required.'); setStep(1); return; }
        if (images.length === 0) { setError('At least one photo is required.'); setStep(2); return; }
        const price = parseFloat(startingPrice);
        if (!price || price <= 0) { setError('Starting price must be greater than 0.'); setStep(3); return; }

        setSubmitting(true);
        try {
            const endsAt = isPermanent
                ? new Date('2099-12-31T23:59:59Z').toISOString()
                : new Date(Date.now() + parseFloat(durationHours) * 3600000).toISOString();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: auction, error: auctionErr } = await (supabase.from('auctions') as any)
                .insert({
                    seller_id: session.user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    brand: category,
                    model: model.trim() || null,
                    condition,
                    starting_price: price,
                    current_price: price,
                    min_increment: parseInt(minIncrement, 10) || 50,
                    ends_at: endsAt,
                    listing_city: region,
                    meetup_area: meetupArea.trim() || region,
                    delivery_available: deliveryAvailable,
                    inspection_available: true,
                })
                .select()
                .single();

            if (auctionErr || !auction) {
                setError(auctionErr?.message ?? 'Failed to create listing.');
                return;
            }

            const auctionId = (auction as { id: string }).id;

            // Upload images via API route
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const formData = new FormData();
                formData.append('file', { uri: img.uri, type: img.mimeType ?? 'image/jpeg', name: `image_${i}.jpg` } as unknown as Blob);
                formData.append('auction_id', auctionId);
                formData.append('position', String(i));

                try {
                    await fetch(`${API_BASE}/api/upload-image`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: formData,
                    });
                } catch {
                    // Non-critical: continue even if one image fails
                }
            }

            Alert.alert('Listed!', 'Your item is now live.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unexpected error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const steps = ['Details', 'Photos', 'Pricing'];

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Listing</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Step indicator */}
            <View style={styles.stepRow}>
                {steps.map((s, i) => (
                    <TouchableOpacity key={s} style={styles.stepItem} onPress={() => { if (i + 1 < step) setStep(i + 1); }}>
                        <View style={[styles.stepDot, step === i + 1 && styles.stepDotActive, step > i + 1 && styles.stepDotDone]}>
                            <Text style={styles.stepDotText}>{step > i + 1 ? '✓' : String(i + 1)}</Text>
                        </View>
                        <Text style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                {/* ── Step 1: Details ── */}
                {step === 1 && (
                    <View style={styles.form}>
                        <FormField label="Title *">
                            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. iPhone 14 Pro Max 256GB" placeholderTextColor="#9ca3af" />
                        </FormField>
                        <FormField label="Category">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                                {CATEGORIES.map(c => (
                                    <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                                        <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </FormField>
                        <FormField label="Model (optional)">
                            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="e.g. SM-G991B" placeholderTextColor="#9ca3af" />
                        </FormField>
                        <FormField label="Condition">
                            <View style={styles.chipRow}>
                                {CONDITIONS.map(c => (
                                    <TouchableOpacity key={c.value} style={[styles.chip, condition === c.value && styles.chipActive]} onPress={() => setCondition(c.value)}>
                                        <Text style={[styles.chipText, condition === c.value && styles.chipTextActive]}>{c.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormField>
                        <FormField label="Region">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                                {REGIONS.map(r => (
                                    <TouchableOpacity key={r} style={[styles.chip, region === r && styles.chipActive]} onPress={() => setRegion(r)}>
                                        <Text style={[styles.chipText, region === r && styles.chipTextActive]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </FormField>
                        <FormField label="Meetup Area (optional)">
                            <TextInput style={styles.input} value={meetupArea} onChangeText={setMeetupArea} placeholder="e.g. Osu, East Legon" placeholderTextColor="#9ca3af" />
                        </FormField>
                        <FormField label="Description (optional)">
                            <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Describe condition, accessories included, etc." placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" />
                        </FormField>
                        <FormField label="Delivery available?">
                            <View style={styles.toggleRow}>
                                {[true, false].map(v => (
                                    <TouchableOpacity key={String(v)} style={[styles.chip, deliveryAvailable === v && styles.chipActive]} onPress={() => setDeliveryAvailable(v)}>
                                        <Text style={[styles.chipText, deliveryAvailable === v && styles.chipTextActive]}>{v ? 'Yes' : 'No'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormField>
                    </View>
                )}

                {/* ── Step 2: Photos ── */}
                {step === 2 && (
                    <View style={styles.form}>
                        <Text style={styles.photoHint}>Add up to 8 photos. First photo is the cover.</Text>
                        <View style={styles.photoGrid}>
                            {images.map((img, i) => (
                                <View key={i} style={styles.photoWrapper}>
                                    <Image source={{ uri: img.uri }} style={styles.photo} />
                                    {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverText}>COVER</Text></View>}
                                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeImage(i)}>
                                        <Text style={styles.photoRemoveText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {images.length < 8 && (
                                <TouchableOpacity style={styles.addPhoto} onPress={pickImages}>
                                    <Text style={styles.addPhotoText}>📷</Text>
                                    <Text style={styles.addPhotoLabel}>Add Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* ── Step 3: Pricing ── */}
                {step === 3 && (
                    <View style={styles.form}>
                        <FormField label="Starting Price (GH₵) *">
                            <TextInput style={styles.input} value={startingPrice} onChangeText={setStartingPrice} placeholder="e.g. 500" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                        </FormField>
                        <FormField label="Minimum Bid Increment (GH₵)">
                            <TextInput style={styles.input} value={minIncrement} onChangeText={setMinIncrement} placeholder="50" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                        </FormField>
                        <FormField label="Listing Duration">
                            <View style={styles.chipRow}>
                                {[true, false].map(v => (
                                    <TouchableOpacity key={String(v)} style={[styles.chip, isPermanent === v && styles.chipActive]} onPress={() => setIsPermanent(v)}>
                                        <Text style={[styles.chipText, isPermanent === v && styles.chipTextActive]}>{v ? '♾ Permanent' : '⏰ Timed'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormField>
                        {!isPermanent && (
                            <FormField label="Duration (hours)">
                                <TextInput style={styles.input} value={durationHours} onChangeText={setDurationHours} placeholder="72" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                            </FormField>
                        )}
                        <View style={styles.summary}>
                            <Text style={styles.summaryTitle}>Summary</Text>
                            <SummaryRow label="Title" value={title || '—'} />
                            <SummaryRow label="Category" value={category} />
                            <SummaryRow label="Condition" value={CONDITIONS.find(c => c.value === condition)?.label ?? condition} />
                            <SummaryRow label="Region" value={region} />
                            <SummaryRow label="Photos" value={`${images.length} selected`} />
                            <SummaryRow label="Starting Price" value={startingPrice ? `GH₵ ${startingPrice}` : '—'} />
                            <SummaryRow label="Duration" value={isPermanent ? 'Permanent' : `${durationHours}h`} />
                        </View>
                    </View>
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.backFooterBtn} onPress={() => setStep(s => s - 1)}>
                        <Text style={styles.backFooterText}>← Back</Text>
                    </TouchableOpacity>
                )}
                {step < 3
                    ? <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(s => s + 1)}>
                        <Text style={styles.nextBtnText}>Next →</Text>
                    </TouchableOpacity>
                    : <TouchableOpacity style={[styles.nextBtn, submitting && styles.btnDisabled]} onPress={handleSubmit} disabled={submitting}>
                        {submitting
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.nextBtnText}>Publish Listing</Text>
                        }
                    </TouchableOpacity>
                }
            </View>
        </View>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>{label}</Text>
            <Text style={styles.summaryVal} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    backText: { fontSize: 16, color: '#000' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: '#000' },
    stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    stepItem: { alignItems: 'center', gap: 4 },
    stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
    stepDotActive: { backgroundColor: '#000' },
    stepDotDone: { backgroundColor: '#10b981' },
    stepDotText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    stepLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
    stepLabelActive: { color: '#000' },
    errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', margin: 12, padding: 10 },
    errorText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
    body: { flex: 1 },
    form: { padding: 16, gap: 16 },
    field: { gap: 6 },
    fieldLabel: { fontSize: 10, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#000' },
    textarea: { height: 100, paddingTop: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
    chipActive: { backgroundColor: '#000', borderColor: '#000' },
    chipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
    chipTextActive: { color: '#fff' },
    toggleRow: { flexDirection: 'row', gap: 8 },
    photoHint: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoWrapper: { width: 100, height: 100, position: 'relative' },
    photo: { width: 100, height: 100 },
    coverBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 2, alignItems: 'center' },
    coverText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    photoRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    addPhoto: { width: 100, height: 100, borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
    addPhotoText: { fontSize: 24 },
    addPhotoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
    summary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
    summaryTitle: { fontSize: 11, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    summaryKey: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
    summaryVal: { fontSize: 12, color: '#000', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
    footer: { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    backFooterBtn: { flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
    backFooterText: { fontSize: 14, fontWeight: '700', color: '#374151' },
    nextBtn: { flex: 2, backgroundColor: '#000', paddingVertical: 14, alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
    session: Session;
    onBack: () => void;
}

export default function SellerApplyScreen({ session, onBack }: Props) {
    const [loading, setLoading] = useState(true);
    const [existing, setExisting] = useState<{ status: string } | null>(null);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        void (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: app } = await (supabase.from('seller_applications') as any)
                .select('status')
                .eq('user_id', session.user.id)
                .maybeSingle();
            setExisting(app as { status: string } | null);

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, location')
                .eq('id', session.user.id)
                .maybeSingle();
            const p = profile as { full_name: string | null; location: string | null } | null;
            if (p?.full_name) setFullName(p.full_name);
            if (p?.location) setLocation(p.location);
            setLoading(false);
        })();
    }, [session.user.id]);

    const handleSubmit = async () => {
        setError('');
        if (!fullName.trim()) { setError('Full name is required.'); return; }
        if (!phone.trim()) { setError('Phone number is required.'); return; }
        if (!location.trim()) { setError('Location is required.'); return; }

        setSubmitting(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: err } = await (supabase.from('seller_applications') as any).insert({
                user_id: session.user.id,
                full_name: fullName.trim(),
                phone: phone.trim(),
                location: location.trim(),
                reason: reason.trim() || null,
                status: 'pending',
            });
            if (err) { setError(err.message); }
            else { setSubmitted(true); }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unexpected error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Become a Seller</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                {/* Already applied */}
                {existing && !submitted && (
                    <View style={styles.statusCard}>
                        <Text style={styles.statusIcon}>{existing.status === 'approved' ? '✅' : existing.status === 'rejected' ? '❌' : '⏳'}</Text>
                        <Text style={styles.statusTitle}>
                            {existing.status === 'approved' ? 'You\'re approved as a seller!'
                                : existing.status === 'rejected' ? 'Application not approved'
                                    : 'Application pending review'}
                        </Text>
                        <Text style={styles.statusBody}>
                            {existing.status === 'approved' ? 'You can now create listings from the Dashboard.'
                                : existing.status === 'rejected' ? 'Your application was not approved. Contact support for details.'
                                    : 'We\'ll review your application and notify you within 24–48 hours.'}
                        </Text>
                    </View>
                )}

                {/* Success */}
                {submitted && (
                    <View style={styles.statusCard}>
                        <Text style={styles.statusIcon}>🎉</Text>
                        <Text style={styles.statusTitle}>Application Submitted!</Text>
                        <Text style={styles.statusBody}>We'll review your application and notify you within 24–48 hours.</Text>
                        <TouchableOpacity style={styles.doneBtn} onPress={onBack}>
                            <Text style={styles.doneBtnText}>Back to Profile</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Form — show only if no existing application and not yet submitted */}
                {!existing && !submitted && (
                    <View style={styles.form}>
                        <Text style={styles.intro}>
                            Apply to sell on AuctionsGH. It's free and takes 2 minutes. Our team reviews all applications within 24–48 hours.
                        </Text>

                        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

                        <FormField label="Full Name *">
                            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your legal name" placeholderTextColor="#9ca3af" />
                        </FormField>
                        <FormField label="Phone Number *">
                            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+233 XX XXX XXXX" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                        </FormField>
                        <FormField label="Location / City *">
                            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Accra, Greater Accra" placeholderTextColor="#9ca3af" />
                        </FormField>
                        <FormField label="What will you sell? (optional)">
                            <TextInput style={[styles.input, styles.textarea]} value={reason} onChangeText={setReason} placeholder="e.g. Used electronics, phones, laptops" placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" />
                        </FormField>

                        <TouchableOpacity style={[styles.submitBtn, submitting && styles.btnDisabled]} onPress={handleSubmit} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Application</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 48 }} />
            </ScrollView>
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

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f9fafb' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backBtn: { width: 40 },
    backText: { fontSize: 20, color: '#000' },
    title: { fontSize: 18, fontWeight: '900', color: '#000' },
    body: { flex: 1 },
    statusCard: { alignItems: 'center', padding: 32, gap: 10 },
    statusIcon: { fontSize: 48 },
    statusTitle: { fontSize: 18, fontWeight: '900', color: '#000', textAlign: 'center' },
    statusBody: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
    doneBtn: { marginTop: 12, backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 12 },
    doneBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
    form: { padding: 16, gap: 12 },
    intro: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 4 },
    errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', padding: 10 },
    errorText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
    field: { gap: 6 },
    fieldLabel: { fontSize: 10, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#000' },
    textarea: { height: 100, paddingTop: 10 },
    submitBtn: { backgroundColor: '#000', paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    btnDisabled: { opacity: 0.5 },
    submitText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

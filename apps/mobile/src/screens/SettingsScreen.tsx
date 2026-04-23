import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
    session: Session;
    onBack: () => void;
    onSignOut: () => void;
}

type NotifPrefs = {
    outbid: boolean;
    auction_won: boolean;
    auction_ended: boolean;
    new_offer: boolean;
    offer_accepted: boolean;
    offer_message: boolean;
    order_update: boolean;
};

const defaultPrefs: NotifPrefs = {
    outbid: true,
    auction_won: true,
    auction_ended: true,
    new_offer: true,
    offer_accepted: true,
    offer_message: true,
    order_update: true,
};

const NOTIF_LABELS: Record<keyof NotifPrefs, string> = {
    outbid: 'Outbid alerts',
    auction_won: 'Auction won',
    auction_ended: 'Auction ended',
    new_offer: 'New offer received',
    offer_accepted: 'Offer accepted/declined',
    offer_message: 'Offer messages',
    order_update: 'Order updates',
};

export default function SettingsScreen({ session, onBack, onSignOut }: Props) {
    const [profile, setProfile] = useState<{ full_name: string | null; username: string | null; location: string | null } | null>(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [location, setLocation] = useState('');
    const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        const [profileRes, prefsRes] = await Promise.all([
            supabase.from('profiles').select('full_name, username, location').eq('id', session.user.id).maybeSingle(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('notification_preferences') as any)
                .select('notification_type, enabled')
                .eq('user_id', session.user.id),
        ]);

        const p = profileRes.data as typeof profile;
        setProfile(p);
        setFullName(p?.full_name ?? '');
        setUsername(p?.username ?? '');
        setLocation(p?.location ?? '');

        const prefRows = (prefsRes.data ?? []) as { notification_type: string; enabled: boolean }[];
        const merged = { ...defaultPrefs };
        prefRows.forEach(r => {
            if (r.notification_type in merged) {
                (merged as Record<string, boolean>)[r.notification_type] = r.enabled;
            }
        });
        setPrefs(merged);
        setLoading(false);
    }, [session.user.id]);

    useEffect(() => { void load(); }, [load]);

    const togglePref = async (key: keyof NotifPrefs, value: boolean) => {
        setPrefs(p => ({ ...p, [key]: value }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('notification_preferences') as any)
            .upsert({ user_id: session.user.id, notification_type: key, enabled: value }, { onConflict: 'user_id,notification_type' });
    };

    const saveProfile = async () => {
        setSaving(true);
        setError('');
        const { error: err } = await supabase
            .from('profiles')
            .update({ full_name: fullName.trim() || null, username: username.trim() || null, location: location.trim() || null })
            .eq('id', session.user.id);
        if (err) setError(err.message);
        else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
        setSaving(false);
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
        ]);
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                {/* Profile */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profile</Text>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <View style={styles.field}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#9ca3af" />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="@username" placeholderTextColor="#9ca3af" autoCapitalize="none" />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Accra, Ghana" placeholderTextColor="#9ca3af" />
                    </View>
                    <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={saveProfile} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Profile'}</Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    {(Object.keys(NOTIF_LABELS) as (keyof NotifPrefs)[]).map(key => (
                        <View key={key} style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>{NOTIF_LABELS[key]}</Text>
                            <Switch
                                value={prefs[key]}
                                onValueChange={(v) => void togglePref(key, v)}
                                trackColor={{ true: '#000', false: '#e5e7eb' }}
                                thumbColor="#fff"
                            />
                        </View>
                    ))}
                </View>

                {/* Account */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <Text style={styles.emailRow}>{session.user.email}</Text>
                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 48 }} />
            </ScrollView>
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
    section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
    field: { marginBottom: 12 },
    label: { fontSize: 10, fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#000' },
    saveBtn: { backgroundColor: '#000', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    btnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    errorText: { color: '#dc2626', fontSize: 12, marginBottom: 10 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    toggleLabel: { fontSize: 14, color: '#000', fontWeight: '500' },
    emailRow: { fontSize: 13, color: '#6b7280', marginBottom: 14 },
    signOutBtn: { borderWidth: 1, borderColor: '#fca5a5', paddingVertical: 12, alignItems: 'center' },
    signOutText: { color: '#dc2626', fontSize: 13, fontWeight: '900' },
});

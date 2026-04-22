import React, { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface Props {
    onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');

    const handleSubmit = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }
        setBusy(true);
        if (mode === 'signin') {
            const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            setBusy(false);
            if (error) { Alert.alert('Sign in failed', error.message); return; }
            onAuthenticated();
        } else {
            const { error } = await supabase.auth.signUp({ email: email.trim(), password });
            setBusy(false);
            if (error) { Alert.alert('Sign up failed', error.message); return; }
            Alert.alert('Check your inbox', 'Verify your email address then sign in.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.card}>
                <Text style={styles.title}>AuctionsGH</Text>
                <Text style={styles.subtitle}>
                    {mode === 'signin' ? 'Sign in to continue' : 'Create an account'}
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={busy}>
                    {busy
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
                    <Text style={styles.toggleText}>
                        {mode === 'signin'
                            ? "Don't have an account? Sign up"
                            : 'Already have an account? Sign in'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
    input: {
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827',
    },
    primaryBtn: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    toggleText: { color: '#6366f1', fontSize: 13, textAlign: 'center', marginTop: 4 },
});

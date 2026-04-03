'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Laptop2, Loader2, RefreshCw, Smartphone, Tablet, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ActiveSession = {
    session_id: string;
    created_at: string | null;
    updated_at: string | null;
    not_after: string | null;
    ip: string | null;
    user_agent: string | null;
};

function readSessionId(accessToken?: string | null) {
    if (!accessToken) return null;

    try {
        const payload = accessToken.split('.')[1];
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(atob(padded)) as { session_id?: string };
        return decoded.session_id ?? null;
    } catch {
        return null;
    }
}

function parseUserAgent(userAgent: string | null) {
    const ua = (userAgent ?? '').toLowerCase();
    const isMobile = /iphone|android.+mobile|mobile/.test(ua);
    const isTablet = /ipad|tablet|android(?!.*mobile)/.test(ua);
    const browser = ua.includes('edg/')
        ? 'Edge'
        : ua.includes('chrome/')
            ? 'Chrome'
            : ua.includes('firefox/')
                ? 'Firefox'
                : ua.includes('safari/') && !ua.includes('chrome/')
                    ? 'Safari'
                    : ua.includes('instagram')
                        ? 'Instagram Browser'
                        : ua.includes('facebook')
                            ? 'Facebook Browser'
                            : 'Unknown browser';
    const platform = ua.includes('iphone') || ua.includes('ipad')
        ? 'iPhone / iPad'
        : ua.includes('android')
            ? 'Android'
            : ua.includes('windows')
                ? 'Windows'
                : ua.includes('mac os') || ua.includes('macintosh')
                    ? 'Mac'
                    : ua.includes('linux')
                        ? 'Linux'
                        : 'Unknown device';

    return {
        browser,
        platform,
        kind: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    } as const;
}

function DeviceIcon({ kind }: { kind: 'desktop' | 'mobile' | 'tablet' }) {
    if (kind === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (kind === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Laptop2 className="h-4 w-4" />;
}

function formatTimestamp(value: string | null) {
    if (!value) return 'Unknown';
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ActiveSessionsPanel({
    onSignedOutEverywhere,
}: {
    onSignedOutEverywhere: () => Promise<void>;
}) {
    const supabase = useMemo(() => createClient(), []);
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [signingOutOthers, setSigningOutOthers] = useState(false);
    const [signingOutAll, setSigningOutAll] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadSessions = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError('');

        const { data: sessionData } = await supabase.auth.getSession();
        setCurrentSessionId(readSessionId(sessionData.session?.access_token ?? null));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase.rpc('list_active_sessions') as any);

        if (rpcError) {
            setError(rpcError.message ?? 'Could not load active sessions.');
        } else {
            setSessions((data ?? []) as ActiveSession[]);
        }

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSignOutOthers = async () => {
        setSigningOutOthers(true);
        setError('');
        setSuccess('');

        const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
        if (signOutError) {
            setError(signOutError.message);
        } else {
            setSuccess('Signed out all other devices.');
            await loadSessions(true);
        }

        setSigningOutOthers(false);
    };

    const handleSignOutAll = async () => {
        setSigningOutAll(true);
        setError('');
        setSuccess('');
        try {
            await onSignedOutEverywhere();
        } catch (signOutError) {
            setError(signOutError instanceof Error ? signOutError.message : 'Failed to sign out all sessions.');
            setSigningOutAll(false);
        }
    };

    return (
        <div className="border-t border-gray-200 pt-6 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-black">Active sessions</p>
                    <p className="text-xs text-gray-400 mt-0.5">See where your account is currently signed in and remove other devices if needed.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                    <button
                        onClick={() => void loadSessions(true)}
                        disabled={refreshing || loading || signingOutOthers || signingOutAll}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors disabled:opacity-50"
                    >
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                    </button>
                    <button
                        onClick={handleSignOutOthers}
                        disabled={signingOutOthers || loading || sessions.length <= 1 || signingOutAll}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors disabled:opacity-50"
                    >
                        {signingOutOthers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Sign out other devices
                    </button>
                    <button
                        onClick={handleSignOutAll}
                        disabled={signingOutAll || signingOutOthers}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors disabled:opacity-50"
                    >
                        {signingOutAll ? 'Signing out...' : 'Sign out all'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 text-emerald-600 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {success}
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading active sessions...
                </div>
            ) : sessions.length === 0 ? (
                <div className="border border-gray-200 bg-gray-50 px-5 py-5 text-sm text-gray-500">
                    No active sessions were returned for this account.
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map((session) => {
                        const parsed = parseUserAgent(session.user_agent);
                        const isCurrent = session.session_id === currentSessionId;
                        const lastSeen = session.updated_at ?? session.created_at;

                        return (
                            <div key={session.session_id} className="border border-gray-200 bg-white px-5 py-5">
                                <div className="flex items-start justify-between gap-5">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-black">
                                                <DeviceIcon kind={parsed.kind} />
                                                {parsed.browser}
                                            </span>
                                            <span className="text-xs text-gray-400">{parsed.platform}</span>
                                            {isCurrent && (
                                                <span className="inline-flex px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-black text-white">
                                                    This device
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 break-all">
                                            {session.user_agent?.trim() || 'Unknown user agent'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-semibold text-gray-500">Last active</p>
                                        <p className="text-xs text-black mt-1">{formatTimestamp(lastSeen)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 text-xs">
                                    <div>
                                        <p className="font-semibold text-gray-500">Signed in</p>
                                        <p className="text-black mt-1">{formatTimestamp(session.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-500">Session ends</p>
                                        <p className="text-black mt-1">{formatTimestamp(session.not_after)}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-500">IP</p>
                                        <p className="text-black mt-1">{session.ip || 'Not available'}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

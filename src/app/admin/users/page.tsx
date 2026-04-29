'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/auth/AdminGuard';
import { createClient } from '@/lib/supabase/client';
import { banUserAction, unbanUserAction } from '@/app/actions/adminUsers';
import { isMissingBanColumnError } from '@/lib/supabase/banGuards';
import { Ban, Search, ShieldCheck, User as UserIcon, Check } from 'lucide-react';

interface AdminUser {
    id: string;
    username: string;
    full_name: string | null;
    location: string | null;
    is_verified: boolean;
    is_admin: boolean;
    is_super_admin: boolean;
    is_banned: boolean;
    banned_at: string | null;
    banned_reason: string | null;
    created_at: string;
}

function UsersContent() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [banReason, setBanReason] = useState<Record<string, string>>({});
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id, username, full_name, location, is_verified, is_admin, is_super_admin, is_banned, banned_at, banned_reason, created_at')
            .order('created_at', { ascending: false });

        if (fetchError) {
            setError(
                isMissingBanColumnError(fetchError)
                    ? 'Ban columns are not in your database yet. Run migration 041_user_bans.sql first.'
                    : fetchError.message
            );
            setUsers([]);
        } else {
            setUsers((data as AdminUser[]) ?? []);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadUsers();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const value = query.trim().toLowerCase();
        if (!value) return users;

        return users.filter((user) =>
            user.username.toLowerCase().includes(value)
            || user.full_name?.toLowerCase().includes(value)
            || user.location?.toLowerCase().includes(value)
            || user.id.toLowerCase().includes(value)
        );
    }, [query, users]);

    const handleBan = async (userId: string) => {
        setPendingId(userId);
        setError(null);

        const result = await banUserAction(userId, banReason[userId]);
        if (!result.success) {
            setError(result.error ?? 'Failed to ban user');
        } else {
            setBanReason((current) => ({ ...current, [userId]: '' }));
            await loadUsers();
        }

        setPendingId(null);
    };

    const handleUnban = async (userId: string) => {
        setPendingId(userId);
        setError(null);

        const result = await unbanUserAction(userId);
        if (!result.success) {
            setError(result.error ?? 'Failed to unban user');
        } else {
            await loadUsers();
        }

        setPendingId(null);
    };

    const totalBanned = users.filter((user) => user.is_banned).length;
    const totalSuperAdmins = users.filter((user) => user.is_super_admin).length;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <div className="flex items-start sm:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest mb-3">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Superior Admin Only
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">User Moderation</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Permanently ban user accounts and keep banned users out of protected areas.
                    </p>
                </div>
                <Link
                    href="/admin/analytics"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors"
                >
                    <ShieldCheck className="h-4 w-4" />
                    Admin Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Users</p>
                    <p className="text-3xl font-black text-black">{users.length}</p>
                </div>
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Banned Users</p>
                    <p className="text-3xl font-black text-black">{totalBanned}</p>
                </div>
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Super Admins</p>
                    <p className="text-3xl font-black text-black">{totalSuperAdmins}</p>
                </div>
            </div>

            <div className="mb-6 border border-gray-200 bg-white p-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Search Users
                </label>
                <div className="flex items-center gap-2 border border-gray-200 px-3 py-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by username, name, location, or user ID"
                        className="w-full text-sm text-black placeholder:text-gray-400 focus:outline-none"
                    />
                </div>
            </div>

            {error && (
                <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-200 border-t-black" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="border border-gray-200 bg-white p-12 text-center">
                    <p className="text-sm text-gray-400">No users matched your search.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredUsers.map((user) => {
                        const canBan = !user.is_banned && !user.is_super_admin;

                        return (
                            <section key={user.id} className="border border-gray-200 bg-white p-5">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <div className="h-10 w-10 bg-black text-white flex items-center justify-center font-black text-sm shrink-0">
                                                {(user.full_name || user.username).slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <Link href={`/users/${user.id}`} className="block truncate text-base font-black text-black hover:underline underline-offset-2">
                                                    {user.full_name || user.username}
                                                </Link>
                                                <p className="text-xs text-gray-400 truncate">
                                                    <Link href={`/users/${user.id}`} className="hover:text-black">
                                                        @{user.username}
                                                    </Link> · {user.location || 'No location'}
                                                </p>
                                            </div>
                                            {user.is_verified && (
                                                <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                                    Verified
                                                </span>
                                            )}
                                            {user.is_admin && (
                                                <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                                    Admin
                                                </span>
                                            )}
                                            {user.is_super_admin && (
                                                <span className="inline-flex items-center gap-1 border border-black bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                                                    Super Admin
                                                </span>
                                            )}
                                            {user.is_banned && (
                                                <span className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-700">
                                                    Banned
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">User ID</p>
                                                <Link href={`/users/${user.id}`} className="font-mono text-xs text-black break-all hover:underline underline-offset-2">
                                                    {user.id}
                                                </Link>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Joined</p>
                                                <p className="text-black">{new Date(user.created_at).toLocaleString('en-GH')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Ban Status</p>
                                                <p className="text-black">
                                                    {user.is_banned && user.banned_at
                                                        ? `Banned ${new Date(user.banned_at).toLocaleString('en-GH')}`
                                                        : 'Active'}
                                                </p>
                                            </div>
                                        </div>

                                        {user.is_banned && user.banned_reason && (
                                            <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-1">Ban reason</p>
                                                <p className="text-sm text-red-800 whitespace-pre-line">{user.banned_reason}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full lg:w-[320px] border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Moderation</p>
                                        {canBan ? (
                                            <>
                                                <textarea
                                                    rows={3}
                                                    value={banReason[user.id] ?? ''}
                                                    onChange={(event) => setBanReason((current) => ({ ...current, [user.id]: event.target.value }))}
                                                    placeholder="Optional internal reason for the permanent ban"
                                                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none bg-white"
                                                />
                                                <button
                                                    onClick={() => void handleBan(user.id)}
                                                    disabled={pendingId === user.id}
                                                    className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    <Ban className="h-4 w-4" />
                                                    {pendingId === user.id ? 'Banning...' : 'Permanent Ban'}
                                                </button>
                                            </>
                                        ) : user.is_banned ? (
                                            <button
                                                onClick={() => void handleUnban(user.id)}
                                                disabled={pendingId === user.id}
                                                className="inline-flex w-full items-center justify-center gap-2 bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                            >
                                                <Check className="h-4 w-4" />
                                                {pendingId === user.id ? 'Unbanning...' : 'Unban User'}
                                            </button>
                                        ) : (
                                            <div className="flex items-start gap-2 text-sm text-gray-600">
                                                <UserIcon className="h-4 w-4 shrink-0 mt-0.5" />
                                                <p>Super admin accounts cannot be banned from this screen.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function AdminUsersPage() {
    return (
        <AdminGuard>
            <UsersContent />
        </AdminGuard>
    );
}

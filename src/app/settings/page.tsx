'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import {
    User, Bell, Shield, LogOut, Check, Eye, EyeOff,
    AlertTriangle, BadgeCheck
} from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'security';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
];

/* ─── Shared field components ─── */
function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
                {label}
            </label>
            {children}
            {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

function TextInput({
    value,
    onChange,
    placeholder,
    type = 'text',
    disabled,
    error,
}: {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    error?: string;
}) {
    return (
        <>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full border px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black focus:ring-2 focus:ring-black transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${error ? 'border-red-400' : 'border-gray-200'}`}
            />
            {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
        </>
    );
}

/* ─── Toggle ─── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative h-5 w-9 shrink-0 transition-colors ${on ? 'bg-black' : 'bg-gray-200'}`}
            aria-pressed={on}
        >
            <span
                className={`absolute top-0.5 h-4 w-4 bg-white block transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
        </button>
    );
}

/* ═══════════════════════════════════════════════════════ */

export default function SettingsPage() {
    const { user, profile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    /* ── Profile ── */
    const [profileForm, setProfileForm] = useState({
        full_name: profile?.full_name ?? '',
        username: profile?.username ?? '',
        phone_number: profile?.phone_number ?? '',
        location: profile?.location ?? '',
    });
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState('');

    const handleProfileSave = async () => {
        if (!user) return;
        setProfileError('');
        try {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('profiles') as any)
                .update({
                    full_name: profileForm.full_name,
                    username: profileForm.username,
                    phone_number: profileForm.phone_number,
                    location: profileForm.location,
                })
                .eq('id', user.id);
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
        } catch {
            setProfileError('Failed to save changes. Please try again.');
        }
    };

    /* ── Notifications ── */
    const [notifSettings, setNotifSettings] = useState({
        new_bid: true,
        auction_ending: true,
        auction_won: true,
        new_message: false,
        promotions: false,
    });
    const toggleNotif = (key: keyof typeof notifSettings) =>
        setNotifSettings((s) => ({ ...s, [key]: !s[key] }));

    /* ── Security ── */
    const [pwForm, setPwForm] = useState({
        current: '',
        newPw: '',
        confirm: '',
    });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSaved, setPwSaved] = useState(false);

    const handlePasswordChange = async () => {
        setPwError('');
        if (!pwForm.newPw || pwForm.newPw.length < 8) {
            setPwError('New password must be at least 8 characters.');
            return;
        }
        if (pwForm.newPw !== pwForm.confirm) {
            setPwError('Passwords do not match.');
            return;
        }
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
            if (error) throw error;
            setPwSaved(true);
            setPwForm({ current: '', newPw: '', confirm: '' });
            setTimeout(() => setPwSaved(false), 2500);
        } catch (e: unknown) {
            setPwError(e instanceof Error ? e.message : 'Failed to update password.');
        }
    };

    const initials =
        profileForm.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ||
        user?.email?.[0]?.toUpperCase() ||
        'U';

    return (
        <AuthGuard>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl font-black text-black tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage your account preferences</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:gap-8">
                    {/* ── Tab Nav ── */}
                    <nav className="flex sm:flex-col gap-1 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 sm:w-44 sm:shrink-0">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors shrink-0 text-left sm:w-full ${activeTab === id
                                    ? 'bg-black text-white'
                                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className="h-4 w-4" strokeWidth={1.5} />
                                {label}
                            </button>
                        ))}
                        <div className="hidden sm:block pt-6 border-t border-gray-100 mt-4">
                            <button
                                onClick={signOut}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-left text-gray-400 hover:text-black hover:bg-gray-50 transition-colors"
                            >
                                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                                Sign out
                            </button>
                        </div>
                    </nav>

                    {/* ── Content ── */}
                    <div className="flex-1 border border-gray-200 mt-2 sm:mt-0 min-w-0">

                        {/* ══ PROFILE TAB ══ */}
                        {activeTab === 'profile' && (
                            <div>
                                {/* Section header */}
                                <div className="px-5 sm:px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-xs font-black text-black uppercase tracking-widest">Profile</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Your public seller information</p>
                                </div>

                                {/* Avatar + identity */}
                                <div className="px-5 sm:px-6 py-5 border-b border-gray-200 flex items-center gap-4">
                                    <div className="h-14 w-14 shrink-0 bg-black text-white flex items-center justify-center text-xl font-black select-none">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-black text-black truncate">
                                                {profileForm.full_name || profileForm.username || 'No name set'}
                                            </p>
                                            {profile?.is_verified && (
                                                <BadgeCheck className="h-4 w-4 text-black shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Member since {new Date(profile?.created_at ?? Date.now()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Form fields */}
                                <div className="px-5 sm:px-6 py-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Full Name">
                                            <TextInput
                                                value={profileForm.full_name}
                                                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                                placeholder="Kwame Mensah"
                                            />
                                        </Field>
                                        <Field label="Username" hint="Shown publicly on listings">
                                            <TextInput
                                                value={profileForm.username}
                                                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                                                placeholder="kwame_m"
                                            />
                                        </Field>
                                    </div>

                                    <Field label="Email Address" hint="Managed through your account login — contact support to change.">
                                        <TextInput
                                            value={user?.email ?? ''}
                                            disabled
                                        />
                                    </Field>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Phone Number" hint="Used for buyer/seller contact">
                                            <TextInput
                                                value={profileForm.phone_number}
                                                onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                                                placeholder="+233 XX XXX XXXX"
                                                type="tel"
                                            />
                                        </Field>
                                        <Field label="City / Region" hint="Helps buyers know your location">
                                            <TextInput
                                                value={profileForm.location}
                                                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                                                placeholder="Accra, Greater Accra"
                                            />
                                        </Field>
                                    </div>

                                    {profileError && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {profileError}
                                        </div>
                                    )}

                                    <div className="pt-1 flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={handleProfileSave}
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors w-full sm:w-auto"
                                        >
                                            {profileSaved ? (
                                                <><Check className="h-4 w-4" /> Saved</>
                                            ) : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ NOTIFICATIONS TAB ══ */}
                        {activeTab === 'notifications' && (
                            <div>
                                <div className="px-5 sm:px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-xs font-black text-black uppercase tracking-widest">Notifications</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Choose when you get notified</p>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {([
                                        { key: 'new_bid', label: 'New bid on your listing', sub: 'When someone places a bid on an item you listed' },
                                        { key: 'auction_ending', label: 'Auction ending soon', sub: '1 hour reminder before your active auction closes' },
                                        { key: 'auction_won', label: 'Auction won', sub: 'Confirmation when your bid wins an auction' },
                                        { key: 'new_message', label: 'New messages', sub: 'When a buyer or seller sends you a message' },
                                        { key: 'promotions', label: 'Promotions & tips', sub: 'Platform updates, featured listings, and seller tips' },
                                    ] as { key: keyof typeof notifSettings; label: string; sub: string }[]).map(({ key, label, sub }) => (
                                        <div key={key} className="flex items-center justify-between px-5 sm:px-6 py-4 gap-4">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-black">{label}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                                            </div>
                                            <Toggle on={notifSettings[key]} onToggle={() => toggleNotif(key)} />
                                        </div>
                                    ))}
                                </div>

                                <div className="px-5 sm:px-6 py-4 border-t border-gray-200">
                                    <p className="text-xs text-gray-400">
                                        Notifications are sent to <span className="font-semibold text-black">{user?.email}</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ══ SECURITY TAB ══ */}
                        {activeTab === 'security' && (
                            <div>
                                {/* Change Password */}
                                <div className="px-5 sm:px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-xs font-black text-black uppercase tracking-widest">Change Password</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Update your login password</p>
                                </div>

                                <div className="px-5 sm:px-6 py-6 space-y-5">
                                    <Field label="Current Password">
                                        <div className="relative">
                                            <TextInput
                                                type={showCurrent ? 'text' : 'password'}
                                                value={pwForm.current}
                                                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                                                placeholder="Enter current password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrent((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                                            >
                                                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </Field>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="New Password" hint="Minimum 8 characters">
                                            <div className="relative">
                                                <TextInput
                                                    type={showNew ? 'text' : 'password'}
                                                    value={pwForm.newPw}
                                                    onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                                                    placeholder="New password"
                                                    error={pwError && pwForm.newPw.length > 0 && pwForm.newPw.length < 8 ? 'Too short' : undefined}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNew((v) => !v)}
                                                    className="absolute right-3 top-3 text-gray-400 hover:text-black transition-colors"
                                                >
                                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                        <Field label="Confirm New Password">
                                            <TextInput
                                                type="password"
                                                value={pwForm.confirm}
                                                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                                                placeholder="Repeat new password"
                                                error={pwForm.confirm && pwForm.confirm !== pwForm.newPw ? 'Doesn\'t match' : undefined}
                                            />
                                        </Field>
                                    </div>

                                    {/* Password strength bar */}
                                    {pwForm.newPw.length > 0 && (
                                        <div>
                                            <div className="flex gap-1 mb-1">
                                                {[...Array(4)].map((_, i) => {
                                                    const strength = Math.min(Math.floor(pwForm.newPw.length / 3), 4);
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`h-1 flex-1 transition-colors ${i < strength ? 'bg-black' : 'bg-gray-200'}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11px] text-gray-400">
                                                {pwForm.newPw.length < 8 ? 'Weak' : pwForm.newPw.length < 12 ? 'Good' : 'Strong'}
                                            </p>
                                        </div>
                                    )}

                                    {pwError && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {pwError}
                                        </div>
                                    )}

                                    <div className="pt-1">
                                        <button
                                            onClick={handlePasswordChange}
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors w-full sm:w-auto"
                                        >
                                            {pwSaved ? (
                                                <><Check className="h-4 w-4" /> Password Updated</>
                                            ) : 'Update Password'}
                                        </button>
                                    </div>
                                </div>

                                {/* Account info */}
                                <div className="px-5 sm:px-6 py-5 border-t border-gray-200 space-y-3">
                                    <h3 className="text-xs font-black text-black uppercase tracking-widest">Account</h3>
                                    <div className="flex items-center justify-between py-1">
                                        <div>
                                            <p className="text-sm font-semibold text-black">Two-Factor Authentication</p>
                                            <p className="text-xs text-gray-400">Add an extra layer of security to your account</p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-100 text-gray-500">Coming soon</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <div>
                                            <p className="text-sm font-semibold text-black">Active sessions</p>
                                            <p className="text-xs text-gray-400">Signed in on this device</p>
                                        </div>
                                        <button
                                            onClick={signOut}
                                            className="text-xs font-semibold text-black underline underline-offset-2 hover:no-underline transition-all"
                                        >
                                            Sign out all
                                        </button>
                                    </div>
                                </div>

                                {/* Danger zone */}
                                <div className="px-5 sm:px-6 py-5 border-t border-gray-200">
                                    <h3 className="text-xs font-black text-black uppercase tracking-widest mb-1">Danger Zone</h3>
                                    <p className="text-xs text-gray-400 mb-4">
                                        Permanently delete your account. All listings, bids, and data will be removed. This cannot be undone.
                                    </p>
                                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-sm font-semibold text-red-500 hover:border-red-500 hover:bg-red-50 transition-colors w-full sm:w-auto justify-center sm:justify-start">
                                        <AlertTriangle className="h-4 w-4" />
                                        Delete My Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile sign out */}
                <div className="sm:hidden mt-6 border-t border-gray-200 pt-4">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
                    >
                        <LogOut className="h-4 w-4" strokeWidth={1.5} />
                        Sign out
                    </button>
                </div>
            </div>
        </AuthGuard>
    );
}

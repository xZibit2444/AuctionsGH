'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import ActiveSessionsPanel from '@/components/settings/ActiveSessionsPanel';
import { PROFILE_IMAGES_BUCKET, GHANA_REGIONS } from '@/lib/constants';
import { isMissingProfileVisibilityColumnError } from '@/lib/supabase/profileGuards';
import { validateImageFile } from '@/lib/validators';
import {
    User, Bell, LogOut, Check, Eye, EyeOff, Shield,
    AlertTriangle, BadgeCheck, Pencil, X, ChevronDown, MapPin, ImagePlus, Loader2
} from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'security';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
];

/* ─── Toggle ─── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative h-5 w-9 shrink-0 transition-colors ${on ? 'bg-black' : 'bg-gray-200'}`}
            aria-pressed={on}
        >
            <span className={`absolute top-0.5 h-4 w-4 bg-white block transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
    );
}

/* ─── Read-only field row ─── */
function InfoRow({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
    return (
        <div className="flex items-start justify-between py-3.5 border-b border-gray-100 last:border-0 gap-4">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest shrink-0 pt-0.5 w-28">{label}</span>
            <span className={`text-sm font-semibold text-right flex-1 truncate ${value ? 'text-black' : 'text-gray-300'}`}>
                {value || placeholder || '—'}
            </span>
        </div>
    );
}

/* ─── Edit field ─── */
function EditField({
    label, value, onChange, placeholder, type = 'text', hint
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; hint?: string;
}) {
    return (
        <div>
            <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors"
            />
            {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

/* ─── Select field — custom dropdown ─── */
const REGIONS = GHANA_REGIONS;

function SelectField({
    label, value, onChange, hint
}: {
    label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div>
            <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">{label}</label>
            <div className="relative" ref={ref}>
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className={`w-full border px-4 py-3 text-sm text-left flex items-center justify-between transition-colors ${open ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                        } bg-white`}
                >
                    <div className="flex items-center gap-2">
                        {value ? (
                            <><MapPin className="h-4 w-4 text-gray-400" /><span className="font-semibold text-black">{value}</span></>
                        ) : (
                            <span className="text-gray-400">Select region</span>
                        )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute left-0 right-0 top-full z-50 bg-white border border-black shadow-sm -mt-px">
                        {REGIONS.map((region) => (
                            <button
                                key={region}
                                type="button"
                                onClick={() => { onChange(region); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-gray-50 ${value === region ? 'font-black text-black bg-gray-50' : 'font-medium text-gray-700'
                                    }`}
                            >
                                <MapPin className={`h-4 w-4 shrink-0 ${value === region ? 'text-black' : 'text-gray-300'}`} />
                                <div>
                                    <p className="leading-none">{region}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {region}
                                    </p>
                                </div>
                                {value === region && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

/* ─── Phone field with +233 prefix ─── */
function PhoneField({
    value, onChange, hint
}: { value: string; onChange: (v: string) => void; hint?: string }) {
    // Strip +233 prefix if stored with it, work with the local part
    const local = value.startsWith('+233') ? value.slice(4).trimStart() : value;

    const handleChange = (raw: string) => {
        // Only allow digits and spaces
        const cleaned = raw.replace(/[^0-9 ]/g, '');
        onChange(cleaned ? `+233 ${cleaned}` : '');
    };

    return (
        <div>
            <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Phone Number</label>
            <div className="flex border border-gray-200 focus-within:border-black transition-colors">
                <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border-r border-gray-200 shrink-0">
                    <span className="text-sm font-bold text-black">GH</span>
                    <span className="text-sm font-semibold text-black">+233</span>
                </div>
                <input
                    type="tel"
                    value={local}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="XX XXX XXXX"
                    maxLength={12}
                    className="flex-1 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none"
                />
            </div>
            {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

function SectionIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
    return (
        <div className="px-5 sm:px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">{eyebrow}</p>
            <h2 className="mt-2 text-lg font-black tracking-tight text-black">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
    );
}

function SummaryStat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'strong' }) {
    return (
        <div className={`border px-4 py-4 ${tone === 'strong' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-black'}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${tone === 'strong' ? 'text-white/65' : 'text-gray-400'}`}>{label}</p>
            <p className="mt-2 text-lg font-black tracking-tight">{value}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════ */
export default function SettingsPage() {
    const { user, profile, signOut, signOutAll } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const [sessionsBusy, setSessionsBusy] = useState(false);
    const [sessionsError, setSessionsError] = useState('');

    const handleSignOutAll = async () => {
        setSessionsBusy(true);
        setSessionsError('');
        try {
            await signOutAll();
            router.push('/');
        } catch (error) {
            setSessionsError(error instanceof Error ? error.message : 'Failed to sign out all sessions.');
        } finally {
            setSessionsBusy(false);
        }
    };

    const [activeTab, setActiveTab] = useState<Tab>('profile');

    /* ── Profile ── */
    const [editing, setEditing] = useState(false);
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        username: '',
        phone_number: '',
        location: '',
        show_past_buys: false,
        show_past_sales: false,
    });
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const visibilitySettingsAvailable = typeof profile?.show_past_buys === 'boolean'
        || typeof profile?.show_past_sales === 'boolean';

    // Sync form when profile loads
    useEffect(() => {
        if (profile) {
            const parts = (profile.full_name ?? '').split(' ');
            const first = parts[0] ?? '';
            const last = parts.slice(1).join(' ');
            setFirstName(first);
            setLastName(last);
            setProfileForm({
                full_name: profile.full_name ?? '',
                username: profile.username ?? '',
                phone_number: profile.phone_number ?? '',
                location: profile.location ?? '',
                show_past_buys: profile.show_past_buys ?? false,
                show_past_sales: profile.show_past_sales ?? false,
            });
            setAvatarUrl(profile.avatar_url ?? '');
        }
    }, [profile]);

    const handleEditCancel = () => {
        // Reset to original
        const parts = (profile?.full_name ?? '').split(' ');
        const first = parts[0] ?? '';
        const last = parts.slice(1).join(' ');
        setFirstName(first);
        setLastName(last);
        setProfileForm({
            full_name: profile?.full_name ?? '',
            username: profile?.username ?? '',
            phone_number: profile?.phone_number ?? '',
            location: profile?.location ?? '',
            show_past_buys: profile?.show_past_buys ?? false,
            show_past_sales: profile?.show_past_sales ?? false,
        });
        setAvatarUrl(profile?.avatar_url ?? '');
        setProfileError('');
        setEditing(false);
    };

    const handleAvatarUpload = async (file?: File | null) => {
        if (!user || !file) return;

        const validationError = validateImageFile(file);
        if (validationError) {
            setProfileError(validationError);
            return;
        }

        setAvatarUploading(true);
        setProfileError('');

        const supabase = createClient();
        const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
        };
        const fileExt = mimeToExt[file.type] ?? 'jpg';
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from(PROFILE_IMAGES_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(filePath);

            // Persist avatar immediately so the user doesn't need a second save step.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: profileUpdateError } = await (supabase.from('profiles') as any)
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (profileUpdateError) throw profileUpdateError;

            setAvatarUrl(publicUrl);
            setProfileSaved(true);
            router.refresh();
            setTimeout(() => setProfileSaved(false), 2500);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Failed to upload profile photo.';
            if (message.toLowerCase().includes('bucket')) {
                setProfileError('Profile photo upload is not set up correctly yet. Create the "profile-images" storage bucket in Supabase and try again.');
            } else {
                setProfileError(message);
            }
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setAvatarUploading(false);
        }
    };

    const handleProfileSave = async () => {
        if (!user) return;
        setProfileError('');
        const normalizedUsername = profileForm.username.trim().toLowerCase();

        // Validate required fields
        if (!profileForm.phone_number || profileForm.phone_number.trim() === '') {
            setProfileError('Phone number is required.');
            return;
        }
        if (!profileForm.location || profileForm.location.trim() === '') {
            setProfileError('Location (region) is required.');
            return;
        }

        try {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let { error } = await (supabase.from('profiles') as any)
                .update({
                    full_name: profileForm.full_name,
                    username: normalizedUsername,
                    phone_number: profileForm.phone_number,
                    location: profileForm.location,
                    show_past_buys: profileForm.show_past_buys,
                    show_past_sales: profileForm.show_past_sales,
                    avatar_url: avatarUrl || null,
                })
                .eq('id', user.id);

            if (error && isMissingProfileVisibilityColumnError(error)) {
                const fallbackResult = await (supabase.from('profiles') as any)
                    .update({
                        full_name: profileForm.full_name,
                        username: normalizedUsername,
                        phone_number: profileForm.phone_number,
                        location: profileForm.location,
                        avatar_url: avatarUrl || null,
                    })
                    .eq('id', user.id);

                error = fallbackResult.error;

                if (!error) {
                    setProfileError('Profile saved, but the public buys/sales toggles need the latest database migration before they can be changed.');
                }
            }

            if (error) {
                const msg = (error as { message?: string }).message ?? '';
                if (msg.includes('phone_number') || (msg.includes('23505') && msg.includes('phone'))) {
                    setProfileError('This phone number is already in use by another account.');
                } else if (msg.includes('username')) {
                    setProfileError('This username is already taken.');
                } else {
                    setProfileError(msg || 'Failed to save. Please try again.');
                }
                return;
            }
            setProfileForm((current) => ({ ...current, username: normalizedUsername }));
            setProfileSaved(true);
            router.refresh();
            setEditing(false);
            setTimeout(() => setProfileSaved(false), 2500);
        } catch (e: unknown) {
            setProfileError(e instanceof Error ? e.message : 'Failed to save. Please try again.');
        }
    };

    /* ── Notifications ── */
    const defaultNotifSettings = {
        new_bid: true,
        auction_ending: true,
        auction_won: true,
        new_message: false,
        promotions: false,
    };
    const [notifSettings, setNotifSettings] = useState(defaultNotifSettings);
    const [notifSaved, setNotifSaved] = useState(false);
    const [notifError, setNotifError] = useState('');

    // Retained only because an old hidden security block still exists lower in the file.
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
    const [pwSaved] = useState(false);
    const [pwError] = useState('');
    const handlePasswordChange = () => {};

    // Sync notification preferences from profile
    useEffect(() => {
        if (profile?.notification_preferences) {
            setNotifSettings({
                ...defaultNotifSettings,
                ...profile.notification_preferences,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const toggleNotif = (key: keyof typeof notifSettings) =>
        setNotifSettings((s) => ({ ...s, [key]: !s[key] }));

    const profileDisplayName = profile?.full_name || profile?.username || user?.email || 'Your account';
    const publicProfileSummary = visibilitySettingsAvailable
        ? `${profile?.show_past_sales ? 'Sales shown' : 'Sales hidden'}${!profile?.is_admin ? ` • ${profile?.show_past_buys ? 'Buys shown' : 'Buys hidden'}` : ''}`
        : 'Privacy migration pending';

    const handleSaveNotifications = async () => {
        if (!user) return;
        setNotifError('');
        try {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('profiles') as any)
                .update({ notification_preferences: notifSettings })
                .eq('id', user.id);
            if (error) throw error;
            setNotifSaved(true);
            setTimeout(() => setNotifSaved(false), 2500);
        } catch (e: unknown) {
            setNotifError(e instanceof Error ? e.message : 'Failed to save. Please try again.');
        }
    };

    /* ── Security ── */
    return (
        <AuthGuard>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28 sm:pb-10">
                {/* Header */}
                <div className="mb-6 sm:mb-8 border border-gray-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_55%,#f3f4f6_100%)] p-6 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-400">Account Center</p>
                            <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-black">Settings</h1>
                            <p className="mt-3 text-sm sm:text-base text-gray-500">
                                Update your public profile, control notifications, and manage device access from one place.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full lg:min-w-[34rem]">
                            <SummaryStat label="Profile" value={profileDisplayName} tone="strong" />
                            <SummaryStat label="Privacy" value={publicProfileSummary} />
                            <SummaryStat label="Signed In" value={user?.email ?? 'No email'} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 lg:gap-8">
                    {/* Tab Nav */}
                    <nav className="border border-gray-200 bg-white p-3 h-fit">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => { setActiveTab(id); setEditing(false); }}
                                className={`group flex items-center gap-3 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all shrink-0 text-left lg:w-full border ${activeTab === id ? 'bg-black text-white border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.08)]' : 'text-gray-500 border-transparent hover:text-black hover:border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span className={`flex h-9 w-9 items-center justify-center border ${activeTab === id ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-white text-gray-400 group-hover:text-black'}`}>
                                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                                </span>
                                <span>
                                    <span className="block">{label}</span>
                                    <span className={`block text-[10px] font-bold uppercase tracking-[0.2em] ${activeTab === id ? 'text-white/60' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                        {id === 'profile' ? 'Identity' : id === 'notifications' ? 'Alerts' : 'Access'}
                                    </span>
                                </span>
                            </button>
                        ))}
                        </div>
                        <div className="hidden lg:block pt-4 border-t border-gray-100 mt-4">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-left text-gray-500 hover:text-black hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                            >
                                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                                Sign out
                            </button>
                        </div>
                    </nav>

                    {/* Content Panel */}
                    <div className="min-w-0 border border-gray-200 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">

                        {/* ══ PROFILE TAB ══ */}
                        {activeTab === 'profile' && (
                            <div>
                                {/* Section header */}
                                <div className="flex items-start justify-between gap-4 border-b border-gray-200">
                                    <SectionIntro eyebrow="Profile" title="Public profile" subtitle="The identity and contact details buyers see across the marketplace." />
                                    <div className="px-5 sm:px-6 py-5">
                                        <div>
                                            {!editing ? (
                                                <button
                                                    onClick={() => setEditing(true)}
                                                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-xs font-semibold text-black hover:border-black transition-colors"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                    Edit
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleEditCancel}
                                                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-500 hover:border-black hover:text-black transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Avatar identity */}
                                <div className="px-5 sm:px-6 py-6 border-b border-gray-200 flex flex-col gap-5 md:flex-row md:items-center bg-gray-50/70">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(e) => void handleAvatarUpload(e.target.files?.[0])}
                                    />
                                    <Avatar
                                        src={avatarUrl || profile?.avatar_url}
                                        name={profile?.full_name || profile?.username || user?.email || 'User'}
                                        size="lg"
                                        className="shrink-0 ring-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-black text-black truncate">
                                                {profile?.full_name || profile?.username || 'No name set'}
                                            </p>
                                            {profile?.is_verified && <BadgeCheck className="h-4 w-4 text-black shrink-0" />}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Member since {new Date(profile?.created_at ?? Date.now()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    {editing && (
                                        <div className="space-y-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={avatarUploading}
                                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors disabled:opacity-50"
                                            >
                                                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                                                {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                                            </button>
                                            <p className="text-[11px] text-gray-400">JPEG, PNG, or WebP. Max 5 MB.</p>
                                        </div>
                                    )}
                                </div>

                                {/* READ-ONLY view */}
                                {!editing && (
                                    <div className="px-5 sm:px-6 py-2">
                                        <InfoRow label="First Name" value={profile?.full_name?.split(' ')[0] ?? ''} placeholder="Not set" />
                                        <InfoRow label="Last Name" value={profile?.full_name?.split(' ').slice(1).join(' ') ?? ''} placeholder="Not set" />
                                        <InfoRow label="Username" value={profile?.username ?? ''} placeholder="Not set" />
                                        <InfoRow label="Email" value={user?.email ?? ''} />
                                        <InfoRow label="Phone" value={profile?.phone_number ?? ''} placeholder="Not set" />
                                        <InfoRow label="Location" value={profile?.location ?? ''} placeholder="Not set" />
                                        {visibilitySettingsAvailable ? (
                                            <>
                                                <InfoRow
                                                    label="Past Sales"
                                                    value={profile?.show_past_sales ? 'Shown publicly' : 'Hidden publicly'}
                                                />
                                                {!profile?.is_admin && (
                                                    <InfoRow
                                                        label="Past Buys"
                                                        value={profile?.show_past_buys ? 'Shown publicly' : 'Hidden publicly'}
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <InfoRow
                                                label="Profile Privacy"
                                                value="Needs latest migration"
                                            />
                                        )}
                                    </div>
                                )}

                                {/* EDIT view */}
                                {editing && (
                                    <div className="px-5 sm:px-6 py-6 space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <EditField
                                                label="First Name"
                                                value={firstName}
                                                onChange={(v) => {
                                                    setFirstName(v);
                                                    setProfileForm((prev) => ({ ...prev, full_name: `${v} ${lastName}`.trim() }));
                                                }}
                                                placeholder="Kwame"
                                            />
                                            <EditField
                                                label="Last Name"
                                                value={lastName}
                                                onChange={(v) => {
                                                    setLastName(v);
                                                    setProfileForm((prev) => ({ ...prev, full_name: `${firstName} ${v}`.trim() }));
                                                }}
                                                placeholder="Mensah"
                                            />
                                        </div>
                                        <EditField
                                            label="Username"
                                            value={profileForm.username}
                                            onChange={(v) => setProfileForm({ ...profileForm, username: v })}
                                            placeholder="kwame_m"
                                            hint="Shown publicly on listings"
                                        />

                                        {/* Email — read only, no edit */}
                                        <div>
                                            <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Email</label>
                                            <div className="w-full border border-gray-100 px-4 py-3 text-sm text-gray-400 bg-gray-50 flex items-center justify-between">
                                                <span>{user?.email}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 ml-2 shrink-0">Cannot change</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <PhoneField
                                                value={profileForm.phone_number}
                                                onChange={(v) => setProfileForm({ ...profileForm, phone_number: v })}
                                                hint="Used for buyer/seller contact"
                                            />
                                            <SelectField
                                                label="Region"
                                                value={profileForm.location}
                                                onChange={(v) => setProfileForm({ ...profileForm, location: v })}

                                                hint="Helps buyers know your location"
                                            />
                                        </div>

                                        {visibilitySettingsAvailable ? (
                                            <div className="space-y-3">
                                                <div className="border border-gray-200 bg-gray-50 px-4 py-4 flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-black">Show past sales on public profile</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            When enabled, your public profile can show past listing history and completed sales.
                                                        </p>
                                                    </div>
                                                    <Toggle
                                                        on={profileForm.show_past_sales}
                                                        onToggle={() => setProfileForm((prev) => ({ ...prev, show_past_sales: !prev.show_past_sales }))}
                                                    />
                                                </div>

                                                {!profile?.is_admin && (
                                                    <div className="border border-gray-200 bg-gray-50 px-4 py-4 flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-black">Show past buys on public profile</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                When enabled, completed purchases can appear on your public member profile.
                                                            </p>
                                                        </div>
                                                        <Toggle
                                                            on={profileForm.show_past_buys}
                                                            onToggle={() => setProfileForm((prev) => ({ ...prev, show_past_buys: !prev.show_past_buys }))}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="border border-amber-200 bg-amber-50 px-4 py-4">
                                                <p className="text-sm font-semibold text-amber-900">Public visibility toggles are not available yet</p>
                                                <p className="text-xs text-amber-700 mt-0.5">
                                                    The latest profile-privacy database migration has not been applied yet, so these settings are temporarily hidden.
                                                </p>
                                            </div>
                                        )}

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
                                                {profileSaved ? <><Check className="h-4 w-4" /> Saved</> : 'Save Changes'}
                                            </button>
                                            <button
                                                onClick={handleEditCancel}
                                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors w-full sm:w-auto"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══ NOTIFICATIONS TAB ══ */}
                        {activeTab === 'notifications' && (
                            <div>
                                <SectionIntro eyebrow="Notifications" title="Alert preferences" subtitle="Control what reaches you by email and in-app updates." />
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
                                <div className="px-5 sm:px-6 py-4 border-t border-gray-200 space-y-3">
                                    <p className="text-xs text-gray-400">
                                        Sent to <span className="font-semibold text-black">{user?.email}</span>
                                    </p>
                                    {notifError && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {notifError}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSaveNotifications}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                                    >
                                        {notifSaved ? <><Check className="h-4 w-4" /> Saved</> : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ══ SECURITY TAB ══ */}
                        {activeTab === 'security' && (
                            <div>
                                <SectionIntro eyebrow="Security" title="Account access" subtitle="Review signed-in devices and keep control of where your account stays open." />
                                <div className="px-5 sm:px-6 py-6 space-y-5">
                                    <ActiveSessionsPanel onSignedOutEverywhere={handleSignOutAll} />

                                    <div className="border-t border-gray-200 pt-5">
                                        <h3 className="text-xs font-black text-black uppercase tracking-widest mb-4">Change Password</h3>
                                        <div>
                                            <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Current Password</label>
                                            <div className="relative">
                                                <input type={showCurrent ? 'text' : 'password'} value={pwForm.current}
                                                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                                                    placeholder="Enter current password"
                                                    className="w-full border border-gray-200 px-4 py-3 pr-10 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors" />
                                                <button type="button" onClick={() => setShowCurrent(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">New Password</label>
                                                <div className="relative">
                                                    <input type={showNew ? 'text' : 'password'} value={pwForm.newPw}
                                                        onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                                                        placeholder="Min. 8 characters"
                                                        className="w-full border border-gray-200 px-4 py-3 pr-10 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors" />
                                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Confirm Password</label>
                                                <input type="password" value={pwForm.confirm}
                                                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                                                    placeholder="Repeat new password"
                                                    className="w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors" />
                                            </div>
                                        </div>

                                        {pwForm.newPw.length > 0 && (
                                            <div>
                                                <div className="flex gap-1 mb-1">
                                                    {[...Array(4)].map((_, i) => {
                                                        const strength = Math.min(Math.floor(pwForm.newPw.length / 3), 4);
                                                        return <div key={i} className={`h-1 flex-1 transition-colors ${i < strength ? 'bg-black' : 'bg-gray-200'}`} />;
                                                    })}
                                                </div>
                                                <p className="text-[11px] text-gray-400">
                                                    {pwForm.newPw.length < 8 ? 'Too short' : pwForm.newPw.length < 12 ? 'Good' : 'Strong'}
                                                </p>
                                            </div>
                                        )}

                                        {pwError && (
                                            <div className="flex items-center gap-2 text-red-500 text-xs">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                {pwError}
                                            </div>
                                        )}
                                        <button onClick={handlePasswordChange}
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors w-full sm:w-auto">
                                            {pwSaved ? <><Check className="h-4 w-4" /> Updated</> : 'Update Password'}
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-200 pt-5 space-y-3">
                                        <h3 className="text-xs font-black text-black uppercase tracking-widest">Account</h3>
                                        <div className="flex items-center justify-between py-1">
                                            <div>
                                                <p className="text-sm font-semibold text-black">Two-Factor Authentication</p>
                                                <p className="text-xs text-gray-400">Extra layer of security</p>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-100 text-gray-500">Coming soon</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <div>
                                                <p className="text-sm font-semibold text-black">Current device</p>
                                                <p className="text-xs text-gray-400">Sign out of this device only</p>
                                            </div>
                                            <button onClick={handleSignOut} className="text-xs font-semibold text-black underline underline-offset-2 hover:no-underline">Sign out</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile sign out */}
                <div className="sm:hidden mt-6 border-t border-gray-200 pt-4">
                    <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors">
                        <LogOut className="h-4 w-4" strokeWidth={1.5} />
                        Sign out
                    </button>
                </div>
            </div>
        </AuthGuard>
    );
}

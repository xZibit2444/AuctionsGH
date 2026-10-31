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
    AlertTriangle, BadgeCheck, Pencil, X, ChevronDown, MapPin, ImagePlus, Loader2,
    Gavel, Timer, Trophy, MessageCircle, Sparkles, Lock
} from 'lucide-react';

type Section = 'profile' | 'notifications' | 'security';

const sections: { id: Section; label: string; sub: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', sub: 'Identity & privacy', icon: User },
    { id: 'notifications', label: 'Notifications', sub: 'Email & in-app alerts', icon: Bell },
    { id: 'security', label: 'Security', sub: 'Devices & password', icon: Shield },
];

/* ─── Toggle ─── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative h-6.5 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-amber-400' : 'bg-gray-200'}`}
            style={{ height: 26, width: 46 }}
            aria-pressed={on}
        >
            <span
                className={`absolute top-[3px] h-5 w-5 rounded-full transition-all ${on ? 'left-[23px] bg-black' : 'left-[3px] bg-white shadow'}`}
            />
        </button>
    );
}

/* ─── Icon tile ─── */
function IconTile({ icon: Icon }: { icon: React.ElementType }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-700">
            <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
    );
}

/* ─── Toggle row ─── */
function ToggleRow({ icon, title, sub, on, onToggle, trailing }: {
    icon: React.ElementType; title: string; sub: string; on?: boolean; onToggle?: () => void; trailing?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 last:border-0">
            <IconTile icon={icon} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-black">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
            {trailing ?? (on !== undefined && onToggle ? <Toggle on={on} onToggle={onToggle} /> : null)}
        </div>
    );
}

/* ─── Read-only field row ─── */
function InfoRow({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
    return (
        <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0 gap-5">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest shrink-0 pt-0.5 w-28">{label}</span>
            <span className={`text-sm font-semibold text-right flex-1 min-w-0 break-words [overflow-wrap:anywhere] ${value ? 'text-black' : 'text-gray-300'}`}>
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
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors"
            />
            {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
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
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">{label}</label>
            <div className="relative" ref={ref}>
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-left flex items-center justify-between transition-colors ${open ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-gray-200 hover:border-gray-400'
                        } bg-gray-50`}
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
                    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl bg-white border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
                        {REGIONS.map((region) => (
                            <button
                                key={region}
                                type="button"
                                onClick={() => { onChange(region); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-gray-50 ${value === region ? 'font-black text-black bg-amber-400/10' : 'font-medium text-gray-700'
                                    }`}
                            >
                                <MapPin className={`h-4 w-4 shrink-0 ${value === region ? 'text-amber-600' : 'text-gray-300'}`} />
                                <span className="leading-none">{region}</span>
                                {value === region && <Check className="h-3.5 w-3.5 ml-auto shrink-0 text-amber-600" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
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
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/30 transition-colors overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-100 border-r border-gray-200 shrink-0">
                    <span className="text-sm font-bold text-black">GH</span>
                    <span className="text-sm font-semibold text-black">+233</span>
                </div>
                <input
                    type="tel"
                    value={local}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="XX XXX XXXX"
                    maxLength={12}
                    className="flex-1 px-4 py-3 text-sm text-black placeholder-gray-400 bg-transparent focus:outline-none"
                />
            </div>
            {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
        </div>
    );
}

function SectionHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 px-6 sm:px-7 py-6 border-b border-gray-100">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">{eyebrow}</p>
                <h2 className="mt-1.5 text-lg font-black tracking-tight text-black">{title}</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-2xl leading-6">{subtitle}</p>
            </div>
            {action}
        </div>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex items-center gap-3 text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mt-2 mb-1">
            {children}
            <span className="flex-1 h-px bg-gray-100" />
        </p>
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

    const [activeSection, setActiveSection] = useState<Section>('profile');

    const scrollToSection = (id: Section) => {
        setActiveSection(id);
        document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

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
        new_message: true,
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
            <div className="bg-gray-50 min-h-screen">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28 sm:pb-12">

                    {/* Hero */}
                    <div className="relative overflow-hidden mb-8 sm:mb-10">
                        <div className="pointer-events-none absolute -inset-x-10 -top-24 h-56 bg-[radial-gradient(closest-side,rgba(251,191,36,0.28),transparent_70%)]" />
                        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                            <div className="max-w-2xl">
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Account Center</p>
                                <h1 className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight text-black">Settings</h1>
                                <p className="mt-2.5 text-sm sm:text-[15px] text-gray-500 leading-6">
                                    Your identity, alerts and account access - all in one place. Changes apply when you save.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shrink-0">
                                <Avatar
                                    src={avatarUrl || profile?.avatar_url}
                                    name={profile?.full_name || profile?.username || user?.email || 'User'}
                                    size="md"
                                    className="rounded-full"
                                />
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 text-sm font-black text-black break-words">
                                        {profile?.full_name || profile?.username || 'Your account'}
                                        {profile?.is_verified && <BadgeCheck className="h-4 w-4 text-amber-500 shrink-0" />}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5 break-words [overflow-wrap:anywhere]">
                                        {profile?.username ? `@${profile.username}` : (user?.email ?? '')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 lg:gap-8">
                        {/* Section Nav */}
                        <nav className="lg:sticky lg:top-6 h-fit">
                            <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-2">
                                {sections.map(({ id, label, sub, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => scrollToSection(id)}
                                        className={`flex flex-col lg:flex-row items-center gap-2.5 lg:gap-3 rounded-2xl border px-3 lg:px-4 py-3 text-center lg:text-left transition-all ${activeSection === id
                                            ? 'bg-amber-400/15 border-amber-400/60'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeSection === id ? 'bg-amber-400 text-black' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
                                            <Icon className="h-4 w-4" strokeWidth={1.9} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className={`block text-sm font-bold ${activeSection === id ? 'text-amber-700' : 'text-black'}`}>{label}</span>
                                            <span className="hidden lg:block text-[11px] text-gray-400">{sub}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="hidden lg:flex w-full items-center gap-2.5 mt-4 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-500 hover:text-black hover:border-gray-300 transition-colors"
                            >
                                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                                Sign out
                            </button>
                        </nav>

                        {/* Sections */}
                        <div className="min-w-0 space-y-6">

                            {/* ══ PROFILE ══ */}
                            <section id="settings-profile" className="scroll-mt-6 rounded-[20px] border border-gray-200 bg-white overflow-hidden">
                                <SectionHeader
                                    eyebrow="Profile"
                                    title="Public profile"
                                    subtitle="The identity and contact details buyers see across the marketplace."
                                    action={!editing ? (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-black hover:border-gray-400 transition-colors shrink-0"
                                        >
                                            <Pencil className="h-3 w-3" />
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEditCancel}
                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:border-gray-400 hover:text-black transition-colors shrink-0"
                                        >
                                            <X className="h-3 w-3" />
                                            Cancel
                                        </button>
                                    )}
                                />

                                {/* Avatar identity */}
                                <div className="px-6 sm:px-7 py-6 border-b border-gray-100 flex flex-col gap-5 sm:flex-row sm:items-center bg-gray-50/60">
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
                                        className="shrink-0 rounded-3xl"
                                    />
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-black text-black break-words">
                                                {profile?.full_name || profile?.username || 'No name set'}
                                            </p>
                                            {profile?.is_verified && <BadgeCheck className="h-4 w-4 text-amber-500 shrink-0" />}
                                        </div>
                                        <p className="text-xs text-gray-400 break-words [overflow-wrap:anywhere]">{user?.email}</p>
                                    </div>
                                    {editing && (
                                        <div className="space-y-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={avatarUploading}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-black hover:border-gray-400 transition-colors disabled:opacity-50"
                                            >
                                                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                                                {avatarUploading ? 'Uploading...' : 'Upload photo'}
                                            </button>
                                            <p className="text-[11px] text-gray-400">JPEG, PNG, or WebP. Max 5 MB.</p>
                                        </div>
                                    )}
                                </div>

                                {/* READ-ONLY view */}
                                {!editing && (
                                    <div className="px-6 sm:px-7 py-4">
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
                                    <div className="px-6 sm:px-7 py-7">
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
                                            <EditField
                                                label="Username"
                                                value={profileForm.username}
                                                onChange={(v) => setProfileForm({ ...profileForm, username: v })}
                                                placeholder="kwame_m"
                                                hint="Shown publicly on listings"
                                            />

                                            {/* Email — read only, no edit */}
                                            <div>
                                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Email</label>
                                                <div className="w-full rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 bg-gray-50">
                                                    <span className="break-all">{user?.email}</span>
                                                </div>
                                                <span className="mt-1.5 inline-flex text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">Cannot change</span>
                                            </div>

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

                                        <div className="mt-7">
                                            <SubHeading>Public profile privacy</SubHeading>
                                            {visibilitySettingsAvailable ? (
                                                <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100">
                                                    <div className="flex items-center gap-4 px-5 py-4">
                                                        <IconTile icon={Eye} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-black">Show past sales on public profile</p>
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
                                                        <div className="flex items-center gap-4 px-5 py-4">
                                                            <IconTile icon={Check} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold text-black">Show past buys on public profile</p>
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
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                                    <p className="text-sm font-semibold text-amber-900">Public visibility toggles are not available yet</p>
                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        The latest profile-privacy database migration has not been applied yet, so these settings are temporarily hidden.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {profileError && (
                                            <div className="flex items-center gap-2 text-red-500 text-xs mt-5">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                {profileError}
                                            </div>
                                        )}

                                        <div className="pt-6 flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={handleProfileSave}
                                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors w-full sm:w-auto"
                                            >
                                                {profileSaved ? <><Check className="h-4 w-4" /> Saved</> : 'Save changes'}
                                            </button>
                                            <button
                                                onClick={handleEditCancel}
                                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-black hover:border-gray-400 transition-colors w-full sm:w-auto"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* ══ NOTIFICATIONS ══ */}
                            <section id="settings-notifications" className="scroll-mt-6 rounded-[20px] border border-gray-200 bg-white overflow-hidden">
                                <SectionHeader eyebrow="Notifications" title="Alert preferences" subtitle="Control what reaches you by email and in-app updates." />
                                <div>
                                    <ToggleRow icon={Gavel} title="New bid on your listing" sub="When someone places a bid on an item you listed" on={notifSettings.new_bid} onToggle={() => toggleNotif('new_bid')} />
                                    <ToggleRow icon={Timer} title="Auction ending soon" sub="1 hour reminder before your active auction closes" on={notifSettings.auction_ending} onToggle={() => toggleNotif('auction_ending')} />
                                    <ToggleRow icon={Trophy} title="Auction won" sub="Confirmation when your bid wins an auction" on={notifSettings.auction_won} onToggle={() => toggleNotif('auction_won')} />
                                    <ToggleRow icon={MessageCircle} title="New messages" sub="When a buyer or seller sends you a message" on={notifSettings.new_message} onToggle={() => toggleNotif('new_message')} />
                                    <ToggleRow icon={Sparkles} title="Promotions & tips" sub="Platform updates, featured listings, and seller tips" on={notifSettings.promotions} onToggle={() => toggleNotif('promotions')} />
                                </div>
                                <div className="px-6 sm:px-7 py-5 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                                    <button
                                        onClick={handleSaveNotifications}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors"
                                    >
                                        {notifSaved ? <><Check className="h-4 w-4" /> Saved</> : 'Save preferences'}
                                    </button>
                                    <p className="text-xs text-gray-400">
                                        Sent to <span className="font-semibold text-black break-words [overflow-wrap:anywhere]">{user?.email}</span>
                                    </p>
                                    {notifError && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {notifError}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ══ SECURITY ══ */}
                            <section id="settings-security" className="scroll-mt-6 rounded-[20px] border border-gray-200 bg-white overflow-hidden">
                                <SectionHeader eyebrow="Security" title="Account access" subtitle="Review signed-in devices and keep control of where your account stays open." />
                                <div className="px-6 sm:px-7 py-7 space-y-8">
                                    <div>
                                        <SubHeading>Active sessions</SubHeading>
                                        <ActiveSessionsPanel onSignedOutEverywhere={handleSignOutAll} />
                                        {sessionsError && (
                                            <div className="flex items-center gap-2 text-red-500 text-xs mt-3">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                {sessionsError}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <SubHeading>Change password</SubHeading>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                                            <div className="sm:col-span-2">
                                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Current Password</label>
                                                <div className="relative">
                                                    <input type={showCurrent ? 'text' : 'password'} value={pwForm.current}
                                                        onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                                                        placeholder="Enter current password"
                                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors" />
                                                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">New Password</label>
                                                <div className="relative">
                                                    <input type={showNew ? 'text' : 'password'} value={pwForm.newPw}
                                                        onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                                                        placeholder="Min. 8 characters"
                                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors" />
                                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                {pwForm.newPw.length > 0 && (
                                                    <div className="mt-2.5">
                                                        <div className="flex gap-1.5 mb-1.5">
                                                            {[...Array(4)].map((_, i) => {
                                                                const strength = Math.min(Math.floor(pwForm.newPw.length / 3), 4);
                                                                return <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? 'bg-amber-400' : 'bg-gray-200'}`} />;
                                                            })}
                                                        </div>
                                                        <p className="text-[11px] font-bold text-amber-700">
                                                            {pwForm.newPw.length < 8 ? 'Too short' : pwForm.newPw.length < 12 ? 'Good' : 'Strong'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Confirm Password</label>
                                                <input type="password" value={pwForm.confirm}
                                                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                                                    placeholder="Repeat new password"
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors" />
                                            </div>
                                        </div>

                                        {pwError && (
                                            <div className="flex items-center gap-2 text-red-500 text-xs mt-4">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                {pwError}
                                            </div>
                                        )}
                                        <button onClick={handlePasswordChange}
                                            className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors w-full sm:w-auto">
                                            {pwSaved ? <><Check className="h-4 w-4" /> Updated</> : 'Update password'}
                                        </button>
                                    </div>

                                    <div>
                                        <SubHeading>More protection</SubHeading>
                                        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 mt-2">
                                            <div className="flex items-center gap-4 px-5 py-4">
                                                <IconTile icon={Lock} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-black">Two-factor authentication</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">Extra layer of security on sign-in</p>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">Coming soon</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-black">Sign out of this device</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Ends this session only. You can sign back in anytime.</p>
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 bg-white text-sm font-bold text-red-600 hover:bg-red-100 transition-colors shrink-0"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Mobile sign out */}
                    <div className="lg:hidden mt-6">
                        <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-500 hover:text-black transition-colors">
                            <LogOut className="h-4 w-4" strokeWidth={1.5} />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}

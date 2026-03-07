'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { submitSellerApplication } from '@/app/actions/sellerApplication';
import Link from 'next/link';
import { CheckCircle, Clock, XCircle, ChevronRight, ShieldCheck, Loader2, X } from 'lucide-react';
import type { SellerApplicationStatus } from '@/types/database';

interface ExistingApplication {
    id: string;
    status: SellerApplicationStatus;
    admin_notes: string | null;
    created_at: string;
}

type VerifyStatus = 'idle' | 'loading' | 'pending' | 'approved' | 'rejected' | 'error';

function StatusScreen({ app }: { app: ExistingApplication }) {
    if (app.status === 'approved') {
        return (
            <div className="max-w-lg mx-auto text-center py-16 px-4">
                <CheckCircle className="h-12 w-12 text-black mx-auto mb-4" />
                <h1 className="text-2xl font-black text-black tracking-tight mb-2">You&apos;re a Seller!</h1>
                <p className="text-sm text-gray-500 mb-6">Your application was approved. You can now create listings.</p>
                <Link
                    href="/auctions/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                >
                    Create Your First Listing <ChevronRight className="h-4 w-4" />
                </Link>
            </div>
        );
    }

    if (app.status === 'pending') {
        return (
            <div className="max-w-lg mx-auto text-center py-16 px-4">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-black tracking-tight mb-2">Application Under Review</h1>
                <p className="text-sm text-gray-500 mb-2">
                    We received your application on{' '}
                    {new Date(app.created_at).toLocaleDateString('en-GH', { dateStyle: 'long' })}.
                </p>
                <p className="text-sm text-gray-400">We&apos;ll notify you once it&apos;s been reviewed. This usually takes 1–2 business days.</p>
            </div>
        );
    }

    // rejected — allow re-applying
    return null;
}

function VerificationModal({
    url,
    onClose,
}: {
    url: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="relative w-full max-w-2xl bg-white flex flex-col" style={{ height: '80vh' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-black" />
                        <span className="text-sm font-black text-black uppercase tracking-widest">
                            Identity Verification
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4 text-gray-600" />
                    </button>
                </div>
                <iframe
                    src={url}
                    className="flex-1 w-full border-0"
                    allow="camera; microphone"
                    title="Didit Identity Verification"
                />
            </div>
        </div>
    );
}

function SellerApplyForm({ rejectedNotes }: { rejectedNotes?: string | null }) {
    const { profile } = useAuth();
    const [form, setForm] = useState({
        full_name: '',
        phone_number: '',
        location: '',
        items_to_sell: '',
        experience: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Didit verification state
    const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
    const [sessionId, setSessionId] = useState('');
    const [verifyUrl, setVerifyUrl] = useState('');
    const [showModal, setShowModal] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (profile) {
            setForm(prev => ({
                ...prev,
                full_name: profile.full_name || '',
                phone_number: profile.phone_number || '',
                location: profile.location || '',
            }));
        }
    }, [profile]);

    // Stop polling when component unmounts
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const pollStatus = useCallback(async (sid: string) => {
        try {
            const res = await fetch(`/api/didit/status/${sid}`);
            if (!res.ok) return;
            const data = await res.json();
            const status: string = data.status ?? '';
            if (status === 'approved' || status === 'Approved') {
                setVerifyStatus('approved');
                setShowModal(false);
                stopPolling();
            } else if (status === 'rejected' || status === 'Rejected' || status === 'declined') {
                setVerifyStatus('rejected');
                setShowModal(false);
                stopPolling();
            }
        } catch {
            // keep polling silently
        }
    }, [stopPolling]);

    const startVerification = async () => {
        setVerifyStatus('loading');
        setError('');
        try {
            const res = await fetch('/api/didit/session', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                setVerifyStatus('error');
                setError(err.error || 'Could not start verification. Please try again.');
                return;
            }
            const { session_id, url } = await res.json();
            setSessionId(session_id);
            setVerifyUrl(url);
            setVerifyStatus('pending');
            setShowModal(true);
            // Poll every 4 seconds
            pollRef.current = setInterval(() => pollStatus(session_id), 4000);
        } catch {
            setVerifyStatus('error');
            setError('Could not start verification. Please try again.');
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        // Keep polling in background so user gets notified when they return
    };

    const set = (field: string, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (verifyStatus !== 'approved') {
            setError('You must complete identity verification before submitting.');
            return;
        }
        setError('');
        setSubmitting(true);
        const result = await submitSellerApplication({ ...form, didit_session_id: sessionId });
        setSubmitting(false);
        if (!result.success) {
            setError(result.error || 'Something went wrong.');
        } else {
            setSubmitted(true);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-lg mx-auto text-center py-16 px-4">
                <CheckCircle className="h-12 w-12 text-black mx-auto mb-4" />
                <h2 className="text-2xl font-black text-black tracking-tight mb-2">Application Submitted!</h2>
                <p className="text-sm text-gray-500">We&apos;ll review it and notify you within 1–2 business days.</p>
            </div>
        );
    }

    return (
        <>
            {showModal && verifyUrl && (
                <VerificationModal url={verifyUrl} onClose={handleModalClose} />
            )}

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 sm:pb-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-black tracking-tight">Apply to Become a Seller</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Fill in the form below. Our team reviews every application before approving.
                    </p>
                </div>

                {rejectedNotes && (
                    <div className="mb-6 flex items-start gap-3 p-4 border border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-red-700 uppercase tracking-widest mb-0.5">Previous Application Rejected</p>
                            <p className="text-sm text-red-600">{rejectedNotes}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Contact details (pre-filled) */}
                    <section>
                        <h2 className="text-[11px] font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
                            Your Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.full_name}
                                    onChange={e => set('full_name', e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    placeholder="Your full name"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={form.phone_number}
                                    onChange={e => set('phone_number', e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    placeholder="024 000 0000"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    Location / City
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.location}
                                    onChange={e => set('location', e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    placeholder="e.g. Accra, East Legon"
                                />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                            To update your name or phone number permanently, go to{' '}
                            <Link href="/settings" className="underline hover:text-black transition-colors">Settings</Link>.
                        </p>
                    </section>

                    {/* Selling info */}
                    <section>
                        <h2 className="text-[11px] font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
                            About Your Listings
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    What do you plan to sell? <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={form.items_to_sell}
                                    onChange={e => set('items_to_sell', e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                                    placeholder="e.g. Used electronics, second-hand phones, clothing, furniture…"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    Selling Experience <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={form.experience}
                                    onChange={e => set('experience', e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                                    placeholder="Tell us about your selling experience, e.g. sold on Tonaton, Jiji, personal business…"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Didit Identity Verification */}
                    <section>
                        <h2 className="text-[11px] font-black text-black uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
                            Identity Verification <span className="text-red-500">*</span>
                        </h2>

                        {verifyStatus === 'approved' ? (
                            <div className="flex items-center gap-3 p-4 border border-green-200 bg-green-50">
                                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-green-800">Identity Verified</p>
                                    <p className="text-xs text-green-600 mt-0.5">Your national ID has been successfully verified.</p>
                                </div>
                            </div>
                        ) : verifyStatus === 'rejected' ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50">
                                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-red-700">Verification Failed</p>
                                        <p className="text-xs text-red-500 mt-0.5">Your ID could not be verified. Please try again with a clear, valid document.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={startVerification}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    Try Again
                                </button>
                            </div>
                        ) : verifyStatus === 'pending' ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-4 border border-yellow-200 bg-yellow-50">
                                    <Loader2 className="h-5 w-5 text-yellow-600 animate-spin shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-yellow-800">Verification In Progress</p>
                                        <p className="text-xs text-yellow-600 mt-0.5">Complete the steps in the verification window. This page will update automatically.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(true)}
                                    className="text-xs text-gray-500 underline hover:text-black transition-colors"
                                >
                                    Reopen verification window
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    We use <span className="font-semibold text-black">Didit</span> to securely verify your national ID. You&apos;ll be asked to upload a photo of your document and take a quick selfie.
                                </p>
                                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                    <li>Ghana Card, Passport, Voter ID, or Driver&apos;s License accepted</li>
                                    <li>Verification usually takes under 2 minutes</li>
                                    <li>Your data is processed securely and never shared publicly</li>
                                </ul>
                                {verifyStatus === 'error' && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={startVerification}
                                    disabled={verifyStatus === 'loading'}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifyStatus === 'loading' ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Starting…
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="h-4 w-4" />
                                            Verify My Identity
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </section>

                    {error && verifyStatus !== 'error' && (
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || verifyStatus !== 'approved'}
                        className="w-full sm:w-auto px-8 py-3 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Submitting…' : 'Submit Application'}
                    </button>
                    {verifyStatus !== 'approved' && (
                        <p className="text-xs text-gray-400 -mt-4">You must verify your identity before submitting.</p>
                    )}
                </form>
            </div>
        </>
    );
}

function SellerApplyContent() {
    const { profile, user, loading } = useAuth();
    const [appStatus, setAppStatus] = useState<ExistingApplication | null | 'loading'>('loading');

    useEffect(() => {
        if (!user || loading) return;
        const supabase = createClient();
        supabase
            .from('seller_applications')
            .select('id, status, admin_notes, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => setAppStatus(data ?? null));
    }, [user, loading]);

    if (loading || appStatus === 'loading') {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-gray-200 border-t-black" />
            </div>
        );
    }

    // Already a seller
    if (profile?.is_admin) {
        return (
            <div className="max-w-lg mx-auto text-center py-16 px-4">
                <CheckCircle className="h-12 w-12 text-black mx-auto mb-4" />
                <h1 className="text-2xl font-black text-black tracking-tight mb-2">You&apos;re already a seller</h1>
                <p className="text-sm text-gray-500 mb-6">Your account has seller access.</p>
                <Link
                    href="/auctions/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                >
                    Create a Listing <ChevronRight className="h-4 w-4" />
                </Link>
            </div>
        );
    }

    if (appStatus && appStatus.status !== 'rejected') {
        return <StatusScreen app={appStatus} />;
    }

    return (
        <SellerApplyForm
            rejectedNotes={appStatus?.status === 'rejected' ? appStatus.admin_notes : undefined}
        />
    );
}

export default function SellerApplyPage() {
    return (
        <AuthGuard>
            <SellerApplyContent />
        </AuthGuard>
    );
}

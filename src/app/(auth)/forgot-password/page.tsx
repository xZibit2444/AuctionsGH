'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setError('Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
                redirectTo: `${window.location.origin}/callback?next=/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
                return;
            }

            setSent(true);
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-[45%] bg-black flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
                <Link href="/" className="relative z-10">
                    <span className="text-2xl font-black tracking-tighter text-white">
                        AUCTIONS<span className="text-gray-500">GH</span>
                    </span>
                </Link>
                <div className="relative z-10 space-y-4">
                    <h2 className="text-4xl font-black text-white leading-none tracking-tighter">
                        Recover<br />Your Account
                    </h2>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                        Enter your email and we will send you a secure link to reset your password.
                    </p>
                </div>
                <p className="relative z-10 text-[11px] text-gray-600">
                    © {new Date().getFullYear()} AuctionsGH. All rights reserved.
                </p>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
                <div className="w-full max-w-sm mx-auto">
                    {/* Mobile logo */}
                    <Link href="/" className="lg:hidden block mb-8">
                        <span className="text-xl font-black tracking-tighter text-black">
                            AUCTIONS<span className="text-gray-400">GH</span>
                        </span>
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-black tracking-tight">Forgot Password</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            We&apos;ll send a reset link to your email address.
                        </p>
                    </div>

                    {sent ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-3 border border-green-200 bg-green-50 px-4 py-4">
                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-green-800">Check your email</p>
                                    <p className="text-sm text-green-700 mt-0.5">
                                        A password reset link has been sent to <span className="font-semibold">{email}</span>. It expires in 1 hour.
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400">
                                Didn&apos;t receive it? Check your spam folder, or{' '}
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-black underline underline-offset-2 hover:no-underline"
                                >
                                    try again
                                </button>
                                .
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-red-600 text-sm">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60"
                            >
                                {loading ? 'Sending…' : <><span>Send Reset Link</span><ArrowRight className="h-4 w-4" /></>}
                            </button>

                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to Sign In
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

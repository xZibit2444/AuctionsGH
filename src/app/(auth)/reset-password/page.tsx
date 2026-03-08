'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

const passwordSchema = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter.';
    if (!/\d/.test(pw)) return 'Password must contain at least one number.';
    return null;
};

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();
    const { user, loading: authLoading } = useAuth();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sessionReady = !!user;

    useEffect(() => {
        if (!authLoading && !user) {
            setError('Invalid or expired reset link. Please request a new one.');
        }
    }, [authLoading, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const pwError = passwordSchema(password);
        if (pwError) { setError(pwError); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError(updateError.message);
                return;
            }
            setDone(true);
            setTimeout(() => router.push('/'), 3000);
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
                        Set a New<br />Password
                    </h2>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                        Choose a strong password — at least 8 characters with uppercase, lowercase, and a number.
                    </p>
                </div>
                <p className="relative z-10 text-[11px] text-gray-600">
                    © {new Date().getFullYear()} AuctionsGH. All rights reserved.
                </p>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
                <div className="w-full max-w-sm mx-auto">
                    {/* Mobile logo */}
                    <Link href="/" className="lg:hidden block mb-8">
                        <span className="text-xl font-black tracking-tighter text-black">
                            AUCTIONS<span className="text-gray-400">GH</span>
                        </span>
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-black tracking-tight">Reset Password</h1>
                        <p className="text-sm text-gray-400 mt-1">Enter your new password below.</p>
                    </div>

                    {done ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 border border-green-200 bg-green-50 px-4 py-4">
                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-green-800">Password updated!</p>
                                    <p className="text-sm text-green-700 mt-0.5">
                                        You are now signed in. Redirecting you to the home page…
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-red-600 text-sm">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* New password */}
                            <div>
                                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        autoComplete="new-password"
                                        className="w-full border border-gray-200 pr-10 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors"
                                    />
                                    <button type="button" onClick={() => setShowPw(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        placeholder="Repeat your password"
                                        autoComplete="new-password"
                                        className="w-full border border-gray-200 pr-10 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors"
                                    />
                                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Requirements hint */}
                            <p className="text-[11px] text-gray-400">
                                At least 8 characters · one uppercase · one lowercase · one number
                            </p>

                            <button
                                type="submit"
                                disabled={loading || authLoading || !sessionReady}
                                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60"
                            >
                                {loading ? 'Updating…' : <><span>Update Password</span><ArrowRight className="h-4 w-4" /></>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

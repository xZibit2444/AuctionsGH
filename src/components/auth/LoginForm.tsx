'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react';

interface LoginFormProps {
    urlError?: string;
}

export default function LoginForm({ urlError }: LoginFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [formData, setFormData] = useState<LoginInput>({ email: '', password: '' });
    const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);

    const urlErrorMessage = urlError === 'expired'
        ? 'That link has expired. Request a new one below.'
        : urlError === 'auth'
            ? 'Authentication failed. Please sign in again.'
            : urlError
                ? decodeURIComponent(urlError)
                : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setServerError(null);

        const result = loginSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                fieldErrors[issue.path[0] as string] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                setServerError(error.message);
                return;
            }

            router.push('/');
            router.refresh();
        } catch (err) {
            setServerError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }

        router.push('/');
        router.refresh();
    };

    const handleGoogleLogin = async () => {
        const origin = window.location.origin.replace('0.0.0.0', 'localhost');
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${origin}/callback` },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {urlErrorMessage && (
                <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-700 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {urlErrorMessage}
                </div>
            )}
            {serverError && (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {serverError}
                </div>
            )}

            {/* Email */}
            <div>
                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Email</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className={`w-full border px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest">Password</label>
                    <Link href="/forgot-password" className="text-[11px] text-gray-400 hover:text-black transition-colors">
                        Forgot password?
                    </Link>
                </div>
                <div className="relative">
                    <input
                        type={showPw ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className={`w-full border pr-10 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60"
            >
                {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
            </button>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Or continue with</span>
                </div>
            </div>

            {/* Google */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 border border-gray-200 py-3 text-sm font-semibold text-black hover:border-black transition-colors"
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>
        </form>
    );
}

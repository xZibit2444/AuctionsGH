'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buildAuthRedirectUrl } from '@/lib/authRedirect';
import { GHANA_REGIONS } from '@/lib/constants';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

type SignupValues = {
    email: string;
    password: string;
    username: string;
    full_name: string;
    phone_number: string;
    location: string;
};

type FieldErrors = Partial<Record<keyof SignupValues, string>>;

const initialValues: SignupValues = {
    email: '',
    password: '',
    username: '',
    full_name: '',
    phone_number: '+233',
    location: GHANA_REGIONS[0] ?? '',
};

export default function SignupForm() {
    const supabase = createClient();
    const [values, setValues] = useState<SignupValues>(initialValues);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [successEmail, setSuccessEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState<'email' | 'google' | 'facebook' | 'github' | null>(null);

    const disableOauth = useMemo(() => loading !== null, [loading]);

    const updateValue = (field: keyof SignupValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
        setFormError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading('email');
        setFieldErrors({});
        setFormError(null);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            const payload = await response.json();

            if (!response.ok) {
                if (payload?.issues) {
                    const nextErrors: FieldErrors = {};
                    for (const issue of payload.issues) {
                        const field = issue.path?.[0] as keyof SignupValues | undefined;
                        if (field && !nextErrors[field]) {
                            nextErrors[field] = issue.message;
                        }
                    }
                    setFieldErrors(nextErrors);
                }

                if (payload?.error === 'EMAIL_EXISTS') {
                    setFormError('That email address is already registered. Sign in instead.');
                } else if (payload?.error === 'USERNAME_EXISTS') {
                    setFieldErrors((current) => ({ ...current, username: 'That username is already taken.' }));
                } else if (payload?.error === 'PHONE_EXISTS') {
                    setFieldErrors((current) => ({ ...current, phone_number: 'That phone number is already in use.' }));
                } else {
                    setFormError(payload?.error || 'Could not create your account.');
                }
                return;
            }

            setSuccessEmail(values.email);
        } catch {
            setFormError('Could not create your account.');
        } finally {
            setLoading(null);
        }
    };

    const handleFacebookLogin = () => {
        setLoading('facebook');
        setFormError(null);
        supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: { redirectTo: buildAuthRedirectUrl('/') },
        }).then(({ error }) => {
            if (error) {
                setFormError(error.message);
                setLoading(null);
            }
        });
    };

    const handleGoogleLogin = async () => {
        setLoading('google');
        setFormError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: buildAuthRedirectUrl('/') },
        });
        if (error) {
            setFormError(error.message);
            setLoading(null);
        }
    };

    const handleGithubLogin = async () => {
        setLoading('github');
        setFormError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: buildAuthRedirectUrl('/') },
        });
        if (error) {
            setFormError(error.message);
            setLoading(null);
        }
    };

    if (successEmail) {
        return (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)] sm:p-7">
                <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 ring-1 ring-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Verification required
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-950">Check your inbox</h2>
                            <p className="text-sm leading-7 text-gray-600">
                                We sent a verification link to activate your AuctionsGH account. Confirm your email before signing in.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Email address</p>
                        <p className="mt-2 break-all text-base font-semibold text-gray-950">{successEmail}</p>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">What to do next</p>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-900" />
                            <p className="text-sm leading-6 text-gray-600">Open the latest email from AuctionsGH and tap the verification link.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                            <p className="text-sm leading-6 text-gray-600">If you do not see it, check spam, junk, or promotions.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                            <p className="text-sm leading-6 text-gray-600">After verification, return to sign in with your email and password.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={`/verify-email?email=${encodeURIComponent(successEmail)}`}
                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
                        >
                            Open verification instructions
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-black hover:bg-gray-50"
                        >
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                    id="full_name"
                    label="Full Name"
                    placeholder="Kwame Mensah"
                    value={values.full_name}
                    onChange={(event) => updateValue('full_name', event.target.value)}
                    error={fieldErrors.full_name}
                    autoComplete="name"
                    required
                />
                <Input
                    id="username"
                    label="Username"
                    placeholder="kwamemensah"
                    value={values.username}
                    onChange={(event) => updateValue('username', event.target.value)}
                    error={fieldErrors.username}
                    autoComplete="username"
                    required
                />
                <Input
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={values.email}
                    onChange={(event) => updateValue('email', event.target.value)}
                    error={fieldErrors.email}
                    autoComplete="email"
                    required
                />
                <Input
                    id="phone_number"
                    label="Phone Number"
                    placeholder="0201234567 or +233201234567"
                    value={values.phone_number}
                    onChange={(event) => updateValue('phone_number', event.target.value)}
                    error={fieldErrors.phone_number}
                    autoComplete="tel"
                    required
                />
                <div className="space-y-1.5">
                    <label
                        htmlFor="location"
                        className="block text-xs font-bold uppercase tracking-widest text-black"
                    >
                        Region
                    </label>
                    <select
                        id="location"
                        value={values.location}
                        onChange={(event) => updateValue('location', event.target.value)}
                        className="w-full border border-gray-200 bg-white px-4 py-3 text-base text-black transition-colors duration-150 focus:border-black focus:outline-none focus:ring-2 focus:ring-black sm:text-sm"
                    >
                        {GHANA_REGIONS.map((region) => (
                            <option key={region} value={region}>
                                {region}
                            </option>
                        ))}
                    </select>
                    {fieldErrors.location && <p className="text-xs font-medium text-red-500">{fieldErrors.location}</p>}
                </div>
                <Input
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Create a strong password"
                    value={values.password}
                    onChange={(event) => updateValue('password', event.target.value)}
                    error={fieldErrors.password}
                    autoComplete="new-password"
                    required
                />
                <p className="text-xs leading-relaxed text-gray-500">
                    Use at least 8 characters with uppercase, lowercase, and a number.
                </p>
                {formError && (
                    <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {formError}
                    </div>
                )}
                <Button type="submit" className="w-full" size="lg" isLoading={loading === 'email'}>
                    Create Account
                </Button>
            </form>

            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Or continue with</span>
                <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-3">
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={disableOauth}
                    className="flex w-full items-center justify-center gap-2.5 border border-gray-200 py-3 text-sm font-semibold text-black transition-colors hover:border-black disabled:opacity-60"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
                </button>
                <button
                    type="button"
                    onClick={handleFacebookLogin}
                    disabled={disableOauth}
                    className="flex w-full items-center justify-center gap-2.5 border border-gray-200 py-3 text-sm font-semibold text-black transition-colors hover:border-black disabled:opacity-60"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.028 4.388 11.023 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.27h3.328l-.532 3.49h-2.796v8.437C19.612 23.096 24 18.1 24 12.073z" />
                    </svg>
                    {loading === 'facebook' ? 'Signing in...' : 'Continue with Facebook'}
                </button>
                <button
                    type="button"
                    onClick={handleGithubLogin}
                    disabled={disableOauth}
                    className="flex w-full items-center justify-center gap-2.5 border border-gray-200 py-3 text-sm font-semibold text-black transition-colors hover:border-black disabled:opacity-60"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    {loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
                </button>
            </div>
        </div>
    );
}

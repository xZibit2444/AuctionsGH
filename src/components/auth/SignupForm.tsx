'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signupSchema, type SignupInput } from '@/lib/validators';
import { GHANA_REGIONS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SignupForm() {
    const router = useRouter();
    const supabase = createClient();
    const [formData, setFormData] = useState<SignupInput>({
        email: '',
        password: '',
        username: '',
        full_name: '',
        phone_number: '',
        location: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const handleGoogleSignup = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/callback`,
            },
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setServerError(null);

        const result = signupSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                fieldErrors[issue.path[0] as string] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setLoading(true);

        // 1. Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
        });

        if (authError) {
            setServerError(authError.message);
            setLoading(false);
            return;
        }

        // 2. Create their profile
        if (authData.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: authData.user.id,
                username: formData.username,
                full_name: formData.full_name,
                phone_number: formData.phone_number || null,
                location: formData.location || null,
            } as any);

            if (profileError) {
                setServerError(profileError.message);
                setLoading(false);
                return;
            }
        }

        router.push('/');
        router.refresh();
    };

    const update = (field: keyof SignupInput, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {serverError}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    id="full_name"
                    label="Full Name"
                    placeholder="Kwame Asante"
                    value={formData.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                    error={errors.full_name}
                />
                <Input
                    id="username"
                    label="Username"
                    placeholder="kwame_tech"
                    value={formData.username}
                    onChange={(e) => update('username', e.target.value)}
                    error={errors.username}
                />
            </div>

            <Input
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => update('email', e.target.value)}
                error={errors.email}
            />

            <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => update('password', e.target.value)}
                error={errors.password}
            />

            <Input
                id="phone_number"
                label="Phone Number (optional)"
                placeholder="+233XXXXXXXXX"
                value={formData.phone_number ?? ''}
                onChange={(e) => update('phone_number', e.target.value)}
                error={errors.phone_number}
            />

            <div className="space-y-1.5">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Region (optional)
                </label>
                <select
                    id="location"
                    value={formData.location ?? ''}
                    onChange={(e) => update('location', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                >
                    <option value="">Select region</option>
                    {GHANA_REGIONS.map((region) => (
                        <option key={region} value={region}>
                            {region}
                        </option>
                    ))}
                </select>
            </div>

            <Button type="submit" isLoading={loading} className="w-full">
                Create Account
            </Button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-transparent px-4 text-gray-500 font-medium tracking-wide bg-white dark:bg-gray-900">or CONTINUE WITH</span>
                </div>
            </div>

            <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGoogleSignup}
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Continue with Google
            </Button>
        </form>
    );
}

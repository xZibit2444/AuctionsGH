'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signupSchema, type SignupInput } from '@/lib/validators';
import { Eye, EyeOff, AlertTriangle, ArrowRight, MapPin, ChevronDown } from 'lucide-react';

const CITIES = ['Accra', 'Kumasi'];

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
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);

    const update = (field: keyof SignupInput, value: string) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    const updateFirstName = (val: string) => {
        setFirstName(val);
        update('full_name', `${val} ${lastName}`.trim());
    };

    const updateLastName = (val: string) => {
        setLastName(val);
        update('full_name', `${firstName} ${val}`.trim());
    };

    const handleGoogleSignup = async () => {
        const origin = window.location.origin.replace('0.0.0.0', 'localhost');
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${origin}/callback` },
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

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        full_name: formData.full_name,
                        phone_number: formData.phone_number,
                        location: formData.location,
                    },
                },
            });

            if (authError) {
                const msg = authError.message.toLowerCase();
                if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('user already exists')) {
                    setErrors((prev) => ({ ...prev, email: 'An account with this email already exists.' }));
                } else {
                    setServerError(authError.message);
                }
                return;
            }

            if (!authData.user) {
                setServerError('Signup failed. Please try again.');
                return;
            }

            // If email confirmation is required, send to verify page
            if (!authData.session) {
                router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
                return;
            }

            router.push('/');
            router.refresh();
        } catch (err) {
            setServerError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const localPhone = formData.phone_number?.startsWith('+233')
        ? formData.phone_number.slice(4).replace(/\s/g, '')
        : formData.phone_number ?? '';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {serverError}
                </div>
            )}

            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">First Name</label>
                    <input
                        value={firstName}
                        onChange={(e) => updateFirstName(e.target.value)}
                        placeholder="Kwame"
                        className={`w-full border px-3 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.full_name ? 'border-red-400' : 'border-gray-200'}`}
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Last Name</label>
                    <input
                        value={lastName}
                        onChange={(e) => updateLastName(e.target.value)}
                        placeholder="Asante"
                        className={`w-full border px-3 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.full_name ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors.full_name && <p className="text-[10px] text-red-500 mt-0.5">{errors.full_name}</p>}
                </div>
            </div>

            {/* Username */}
            <div>
                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Username</label>
                <input
                    value={formData.username}
                    onChange={(e) => update('username', e.target.value)}
                    placeholder="kwame_tech"
                    className={`w-full border px-3 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.username ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.username && <p className="text-[10px] text-red-500 mt-0.5">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Email</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full border px-4 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
                <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Password</label>
                <div className="relative">
                    <input
                        type={showPw ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => update('password', e.target.value)}
                        placeholder="Min. 8 characters"
                        className={`w-full border pr-10 px-4 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Phone + City */}
            <div className="grid grid-cols-2 gap-3">
                {/* Phone with +233 prefix */}
                <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">Phone <span className="text-red-500">*</span></label>
                    <div className={`flex border focus-within:border-black transition-colors ${errors.phone_number ? 'border-red-400' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-1 px-2 bg-gray-50 border-r border-gray-200 shrink-0">
                            <span className="text-xs font-bold text-black">GH</span>
                            <span className="text-xs font-bold text-black">+233</span>
                        </div>
                        <input
                            type="tel"
                            value={localPhone}
                            onChange={(e) => {
                                const cleaned = e.target.value.replace(/[^0-9]/g, '');
                                update('phone_number', cleaned ? `+233${cleaned}` : '');
                            }}
                            placeholder="XXXXXXXXX"
                            maxLength={9}
                            className="flex-1 px-2 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none"
                        />
                    </div>
                    {errors.phone_number && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone_number}</p>}
                </div>

                {/* City select */}
                <div className="relative">
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-1.5">City <span className="text-red-500">*</span></label>
                    <button
                        type="button"
                        onClick={() => setCityOpen(o => !o)}
                        className={`w-full border px-3 py-2.5 text-sm text-left flex items-center justify-between bg-white transition-colors ${cityOpen ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                        <span className={formData.location ? 'text-black font-semibold' : 'text-gray-400'}>
                            {formData.location || 'Select city'}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {cityOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 bg-white border border-black shadow-sm">
                            {CITIES.map((city) => (
                                <button
                                    key={city}
                                    type="button"
                                    onClick={() => { update('location', city); setCityOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 ${formData.location === city ? 'font-black text-black' : 'text-gray-700'}`}
                                >
                                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    {city}
                                </button>
                            ))}
                        </div>
                    )}
                    {errors.location && <p className="text-[10px] text-red-500 mt-0.5">{errors.location}</p>}
                </div>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60 mt-2"
            >
                {loading ? 'Creating account…' : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
            </button>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Or sign up with</span>
                </div>
            </div>

            {/* Google */}
            <button
                type="button"
                onClick={handleGoogleSignup}
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

import Link from 'next/link';
import { Mail } from 'lucide-react';

export const metadata = {
    title: 'Verify Your Email — AuctionsGH',
};

interface VerifyEmailPageProps {
    searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
    const { email } = await searchParams;

    return (
        <div className="min-h-screen flex">
            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-[45%] bg-black flex-col justify-between p-12 relative overflow-hidden">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }}
                />
                <Link href="/" className="relative z-10">
                    <span className="text-2xl font-black tracking-tighter text-white">
                        AUCTIONS<span className="text-gray-500">GH</span>
                    </span>
                </Link>
                <div className="relative z-10 space-y-6">
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest">One step left</p>
                        <h2 className="text-5xl font-black text-white leading-none tracking-tighter">
                            Confirm<br />Your<br />Email
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                        We sent a verification link to your inbox. Click it to activate your account and start bidding.
                    </p>
                </div>
                <p className="relative z-10 text-[11px] text-gray-700">© 2025 AuctionsGH · All rights reserved</p>
            </div>

            {/* Right content panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
                {/* Mobile logo */}
                <div className="lg:hidden mb-10 self-start">
                    <Link href="/">
                        <span className="text-xl font-black tracking-tighter text-black">
                            AUCTIONS<span className="text-gray-400">GH</span>
                        </span>
                    </Link>
                </div>

                <div className="w-full max-w-sm">
                    <div className="flex items-center justify-center w-16 h-16 bg-black rounded-full mx-auto mb-6">
                        <Mail className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-2xl font-black text-black tracking-tight text-center mb-2">
                        Check your inbox
                    </h1>

                    {email ? (
                        <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                            We sent a verification link to{' '}
                            <span className="font-bold text-black">{email}</span>.
                            Click the link in the email to activate your account, then sign in.
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                            We sent a verification link to your email address.
                            Click the link to activate your account, then sign in.
                        </p>
                    )}

                    <div className="space-y-3 bg-gray-50 border border-gray-200 p-4 text-xs text-gray-500 leading-relaxed mb-8">
                        <p><span className="font-bold text-black">Didn&apos;t receive it?</span> Check your spam or junk folder.</p>
                        <p>If the link expires, create the account again or resend the verification from your auth provider settings.</p>
                    </div>

                    <Link
                        href="/login"
                        className="block w-full text-center py-3 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-colors"
                    >
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}

import Link from 'next/link';
import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
    title: 'Create Account — AuctionsGH',
};

export default function SignupPage() {
    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-[45%] bg-black flex-col justify-between p-12 relative overflow-hidden">
                {/* Subtle grid texture */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />

                {/* Logo */}
                <Link href="/" className="relative z-10">
                    <span className="text-2xl font-black tracking-tighter text-white">
                        AUCTIONS<span className="text-gray-500">GH</span>
                    </span>
                </Link>

                {/* Center message */}
                <div className="relative z-10 space-y-6">
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Join the community</p>
                        <h2 className="text-5xl font-black text-white leading-none tracking-tighter">
                            Buy &amp; Sell<br />Phones<br />Securely
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                        Create your free account and start bidding within minutes. Verified listings. Protected transactions.
                    </p>
                    <div className="space-y-3 pt-2">
                        {['Free to join — no subscription', 'Bid on any active listing instantly', 'Sell your phone at the best price', 'Secure payments via verified channels'].map((point) => (
                            <div key={point} className="flex items-center gap-3">
                                <div className="h-1.5 w-1.5 bg-white rounded-full shrink-0" />
                                <p className="text-sm text-gray-400">{point}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative z-10 text-[11px] text-gray-700">© 2025 AuctionsGH · All rights reserved</p>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col">
                {/* Mobile logo */}
                <div className="lg:hidden px-6 pt-6 pb-2">
                    <Link href="/">
                        <span className="text-xl font-black tracking-tighter text-black">
                            AUCTIONS<span className="text-gray-400">GH</span>
                        </span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-6 py-10">
                    <div className="w-full max-w-sm">
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-black tracking-tight">Create account</h1>
                            <p className="text-sm text-gray-400 mt-1">Start buying and selling phones today</p>
                        </div>

                        <SignupForm />

                        <p className="mt-8 text-center text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link href="/login" className="font-black text-black hover:underline underline-offset-2 transition-all">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

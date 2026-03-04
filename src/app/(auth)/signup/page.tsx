import Link from 'next/link';
import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
    title: 'Sign Up — AuctionsGH',
};

export default function SignupPage() {
    return (
        <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* Premium Background Mesh Gradient */}
            <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950 -z-10" />
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-200 to-emerald-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
            </div>

            <div className="w-full max-w-lg">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-90 transition-opacity">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                            <span className="text-white font-bold text-lg">A</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Auctions<span className="text-emerald-600">GH</span>
                        </span>
                    </Link>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Create your account
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Join Ghana&apos;s premium smartphone auction marketplace
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 p-8 sm:p-10">
                    <SignupForm />

                    <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
                        >
                            Log in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

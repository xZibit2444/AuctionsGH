import Link from 'next/link';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';

export const metadata = {
    title: 'Sign In — AuctionsGH',
};

interface LoginPageProps {
    searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const { error } = await searchParams;
    return (
        <div className="min-h-screen flex">
            <AuthBrandPanel variant="login" />

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col">
                {/* Mobile logo */}
                <div className="lg:hidden px-6 pt-6 pb-2">
                    <Link href="/">
                        <Image src="/logo.png" alt="AuctionsGH" width={140} height={40} className="h-9 w-auto object-contain" priority />
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-sm">
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-black tracking-tight">Welcome back</h1>
                            <p className="text-sm text-gray-400 mt-1">Sign in to your account to continue</p>
                        </div>

                        <LoginForm urlError={error} />

                        <p className="mt-8 text-center text-sm text-gray-500">
                            New to AuctionsGH?{' '}
                            <Link href="/signup" className="font-black text-black hover:underline underline-offset-2 transition-all">
                                Create account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

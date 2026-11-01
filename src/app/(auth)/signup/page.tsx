import Link from 'next/link';
import Image from 'next/image';
import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
    title: 'Create Account — AuctionsGH',
};

export default function SignupPage() {
    return (
        <div className="min-h-screen flex">
            <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center px-6 py-10">
                    <div className="w-full max-w-sm">
                        <div className="mb-8 flex justify-center">
                            <Link href="/">
                                <Image src="/logo.png" alt="AuctionsGH" width={180} height={50} className="h-12 w-auto object-contain" priority />
                            </Link>
                        </div>
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-black tracking-tight">Create account</h1>
                            <p className="text-sm text-gray-400 mt-1">Start buying and selling today</p>
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

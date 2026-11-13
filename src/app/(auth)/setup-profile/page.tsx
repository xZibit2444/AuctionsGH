import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SetupProfileForm from '@/components/auth/SetupProfileForm';

export const metadata = {
    title: 'Set up your profile — AuctionsGH',
};

export default function SetupProfilePage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-10">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <Link href="/">
                        <Image src="/logo.png" alt="AuctionsGH" width={180} height={50} className="h-12 w-auto object-contain" priority />
                    </Link>
                </div>
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700 ring-1 ring-amber-100">
                        Step 2 of 2
                    </div>
                    <h1 className="mt-3 text-3xl font-black text-black tracking-tight">Make it yours</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Add a photo and cover so buyers and sellers recognize you. You can change everything later in Settings.
                    </p>
                </div>
                <Suspense fallback={null}>
                    <SetupProfileForm />
                </Suspense>
            </div>
        </div>
    );
}

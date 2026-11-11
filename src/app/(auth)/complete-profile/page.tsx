import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CompletePhoneForm from '@/components/auth/CompletePhoneForm';

export const metadata = {
    title: 'Add your phone number — AuctionsGH',
};

export default function CompleteProfilePage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-10">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex justify-center">
                    <Link href="/">
                        <Image src="/logo.png" alt="AuctionsGH" width={180} height={50} className="h-12 w-auto object-contain" priority />
                    </Link>
                </div>
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-black tracking-tight">Add your phone number</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        A phone number is required on every AuctionsGH account, however you sign in. Buyers and sellers use it to reach each other.
                    </p>
                </div>
                <Suspense fallback={null}>
                    <CompletePhoneForm />
                </Suspense>
            </div>
        </div>
    );
}

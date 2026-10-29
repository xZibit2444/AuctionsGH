import type { Metadata } from 'next';
import SupportForm from '@/components/support/SupportForm';

export const metadata: Metadata = {
    title: 'Contact Support',
    description: 'Send a support request to AuctionsGH about an order, listing, account or anything else.',
};

export default function SupportPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 pb-24 sm:pb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500 mb-3">Support</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">How can we help?</h1>
            <p className="mt-4 mb-8 text-sm sm:text-base text-gray-500 leading-relaxed">
                Tell us about your issue and we will reply by email. We only use your details to answer this request.
            </p>
            <SupportForm />
        </div>
    );
}

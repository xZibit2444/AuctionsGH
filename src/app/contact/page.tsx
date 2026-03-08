import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export const metadata: Metadata = {
    title: 'Contact Us',
    description: 'Get in touch with AuctionsGH for support, seller questions, and marketplace help. We are here to assist you.',
    alternates: { canonical: `${SITE_URL}/contact` },
    openGraph: {
        title: 'Contact AuctionsGH',
        description: 'Reach out to AuctionsGH for support, seller questions, and marketplace help.',
        url: `${SITE_URL}/contact`,
        siteName: 'AuctionsGH',
        images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Contact AuctionsGH' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Contact AuctionsGH',
        description: 'Reach out to AuctionsGH for support, seller questions, and marketplace help.',
        images: ['/logo.png'],
    },
};

const contactOptions = [
    {
        title: 'General Support',
        description: 'Questions about your account, auctions, orders, or notifications.',
        value: 'support@auctionsgh.com',
        href: 'mailto:support@auctionsgh.com',
        icon: Mail,
    },
    {
        title: 'Phone Support',
        description: 'Reach the AuctionsGH team directly for urgent marketplace issues.',
        value: '+233 25 739 6067',
        href: 'tel:+233257396067',
        icon: Phone,
    },
    {
        title: 'Location',
        description: 'Meetups and seller activity are currently focused in Accra.',
        value: 'Accra, Ghana',
        href: '/auctions',
        icon: MapPin,
    },
];

export default function ContactPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500 mb-3">
                    Contact
                </p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
                    Need help with AuctionsGH?
                </h1>
                <p className="mt-4 text-sm sm:text-base text-gray-500 leading-relaxed">
                    Reach out if you need help with an order, want to report a suspicious listing,
                    or have questions about becoming a seller.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-10">
                {contactOptions.map(({ title, description, value, href, icon: Icon }) => (
                    <Link
                        key={title}
                        href={href}
                        className="border border-gray-200 p-5 sm:p-6 hover:border-black transition-colors"
                    >
                        <Icon className="h-5 w-5 text-amber-500 mb-4" strokeWidth={1.75} />
                        <h2 className="text-sm font-black uppercase tracking-widest text-black">{title}</h2>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">{description}</p>
                        <p className="mt-4 text-sm font-semibold text-black break-words">{value}</p>
                    </Link>
                ))}
            </div>

            <div className="mt-10 border border-gray-200 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" strokeWidth={1.75} />
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-black">
                            Safety and disputes
                        </h2>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                            If a buyer or seller behaves suspiciously, keep all communication on-platform,
                            do not share the delivery code early, and contact support with the order or
                            auction link so the team can investigate quickly.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-5">
                            <Link
                                href="/safety"
                                className="inline-flex items-center justify-center px-4 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                            >
                                Read Safety Tips
                            </Link>
                            <Link
                                href="/faq"
                                className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors"
                            >
                                Browse FAQ
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

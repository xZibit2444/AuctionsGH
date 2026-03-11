import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, LockKeyhole, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';
const DEFAULT_OG_IMAGE = '/opengraph-image';

export const metadata: Metadata = {
    title: 'Safety Tips',
    description: 'Marketplace safety guidance for buyers and sellers using AuctionsGH. Learn how to transact securely and avoid scams.',
    alternates: { canonical: `${SITE_URL}/safety` },
    openGraph: {
        title: 'Safety Tips | AuctionsGH',
        description: 'Marketplace safety guidance for buyers and sellers. Learn how to transact securely on AuctionsGH.',
        url: `${SITE_URL}/safety`,
        siteName: 'AuctionsGH',
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'AuctionsGH Safety' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Safety Tips | AuctionsGH',
        description: 'Marketplace safety guidance for buyers and sellers on AuctionsGH.',
        images: [DEFAULT_OG_IMAGE],
    },
};

const safetyTips = [
    {
        title: 'Meet in a public place',
        body: 'Choose a busy, well-lit location in Accra for handover. Avoid isolated meetups and late-night exchanges when possible.',
        icon: ShieldCheck,
    },
    {
        title: 'Inspect before you pay',
        body: 'Buyers should test the item and confirm it matches the listing description before handing over cash or sharing the delivery code.',
        icon: ScanSearch,
    },
    {
        title: 'Keep the delivery code private',
        body: 'Never send the code in chat ahead of the meetup. Share it only after you are satisfied with the item in person.',
        icon: LockKeyhole,
    },
    {
        title: 'Report suspicious behavior',
        body: 'If a seller pressures you, a buyer disappears after winning, or anything feels off, contact AuctionsGH support immediately.',
        icon: ShieldAlert,
    },
];

export default function SafetyPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500 mb-3">
                    Safety Tips
                </p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
                    Stay protected while buying and selling
                </h1>
                <p className="mt-4 text-sm sm:text-base text-gray-500 leading-relaxed">
                    AuctionsGH is built around in-person handover and inspection. These guidelines
                    reduce fraud risk and make disputes easier to resolve.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-10">
                {safetyTips.map(({ title, body, icon: Icon }) => (
                    <section key={title} className="border border-gray-200 p-5 sm:p-6">
                        <Icon className="h-5 w-5 text-amber-500 mb-4" strokeWidth={1.75} />
                        <h2 className="text-sm font-black uppercase tracking-widest text-black">{title}</h2>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed">{body}</p>
                    </section>
                ))}
            </div>

            <div className="mt-10 border border-amber-200 bg-amber-50 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" strokeWidth={1.75} />
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-black">
                            Red flags to stop the transaction
                        </h2>
                        <ul className="mt-4 space-y-2 text-sm text-gray-700 leading-relaxed">
                            <li>The seller refuses inspection before payment.</li>
                            <li>The buyer asks for the delivery code before meeting.</li>
                            <li>The item serial number, condition, or accessories do not match the listing.</li>
                            <li>The other party tries to move communication off-platform too early.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
                <Link
                    href="/contact"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                >
                    Contact Support
                </Link>
                <Link
                    href="/faq"
                    className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors"
                >
                    Read FAQ
                </Link>
            </div>
        </div>
    );
}

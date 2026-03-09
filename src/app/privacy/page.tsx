import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Privacy Policy for AuctionsGH. Learn what data we collect, how we use it, and when we share it.',
    robots: { index: true, follow: true },
    alternates: { canonical: `${SITE_URL}/privacy` },
    openGraph: {
        title: 'Privacy Policy | AuctionsGH',
        description: 'How AuctionsGH collects, uses, stores, and shares personal information.',
        url: `${SITE_URL}/privacy`,
        siteName: 'AuctionsGH',
    },
};

const sections = [
    {
        title: '1. Who We Are',
        body: (
            <>
                <p>
                    AuctionsGH is an online marketplace where users create listings, place bids, make offers,
                    chat about orders, and complete pay-on-delivery transactions. This Privacy Policy explains
                    how we handle personal information when you use our website and mobile app.
                </p>
                <p className="mt-3">
                    If you have privacy questions, contact us at <a href="mailto:hello@auctionsgh.com" className="text-black underline">hello@auctionsgh.com</a>{' '}
                    or +233 257396067.
                </p>
            </>
        ),
    },
    {
        title: '2. Information We Collect',
        body: (
            <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account and profile data:</strong> email address, username, full name, phone number, location, avatar, and account settings.</li>
                <li><strong>Listing and marketplace data:</strong> auction titles, descriptions, photos, pricing, bid history, offers, saved auctions, and seller application details.</li>
                <li><strong>Order and delivery data:</strong> buyer and seller IDs, contact details needed for fulfillment, meetup or address information, delivery status, and the delivery-code workflow used to confirm handover.</li>
                <li><strong>Messages and support data:</strong> order chat messages, notifications, contact requests, and support-related information you send us.</li>
                <li><strong>Trust and community data:</strong> reviews, ratings, seller verification or admin-review information, and fraud or abuse-prevention signals.</li>
                <li><strong>Technical data:</strong> device push-notification tokens, basic app or browser usage information, security logs, and analytics events used to operate and improve the service.</li>
            </ul>
        ),
    },
    {
        title: '3. How We Use Information',
        body: (
            <ul className="list-disc pl-5 space-y-2">
                <li>To create and manage accounts.</li>
                <li>To publish listings and let buyers browse, bid, save, and make offers.</li>
                <li>To create orders, enable buyer-seller communication, and support pay-on-delivery handover.</li>
                <li>To send in-app, email, or push notifications about bids, offers, orders, chats, and account activity.</li>
                <li>To review seller applications, moderate misuse, resolve disputes, and keep the marketplace safe.</li>
                <li>To maintain platform performance, diagnose bugs, and improve product features.</li>
                <li>To comply with legal obligations and enforce our platform rules.</li>
            </ul>
        ),
    },
    {
        title: '4. When Information Is Shared',
        body: (
            <>
                <p>We do not sell your personal information. We may share data in the following limited ways:</p>
                <ul className="list-disc pl-5 mt-3 space-y-2">
                    <li><strong>With other users:</strong> listing content, seller profile details visible on listings, and transaction contact details needed to complete an order.</li>
                    <li><strong>With service providers:</strong> infrastructure and tools we use to run the platform, such as Supabase for authentication and database services, Vercel for hosting, Resend for transactional email, and integrated notification or analytics services.</li>
                    <li><strong>With administrators or moderators:</strong> when needed to review seller applications, investigate fraud, respond to complaints, or enforce marketplace rules.</li>
                    <li><strong>For legal or safety reasons:</strong> if required by law or reasonably necessary to protect users, AuctionsGH, or the public.</li>
                </ul>
            </>
        ),
    },
    {
        title: '5. Payments and Delivery',
        body: (
            <>
                <p>
                    AuctionsGH currently supports pay-on-delivery and meet-and-inspect flows. Based on the current
                    product flow, this policy does not claim that AuctionsGH stores card details.
                </p>
                <p className="mt-3">
                    To help buyers and sellers complete orders safely, we store order records, fulfillment details,
                    delivery status, and the delivery-code verification workflow used to confirm handover.
                </p>
            </>
        ),
    },
    {
        title: '6. Data Retention',
        body: (
            <p>
                We keep information for as long as it is reasonably needed to operate the marketplace, maintain
                order history, investigate abuse, meet legal obligations, and resolve disputes. Some information
                may remain in backups, logs, or compliance records for a limited period after deletion requests.
            </p>
        ),
    },
    {
        title: '7. Your Choices and Rights',
        body: (
            <ul className="list-disc pl-5 space-y-2">
                <li>You can review and update parts of your profile in your account settings.</li>
                <li>You can manage saved listings, notification preferences where available, and whether to continue using the platform.</li>
                <li>You can contact us to request access, correction, or deletion of personal data, subject to legal and safety requirements.</li>
                <li>You can ask questions about how your information is used by emailing <a href="mailto:hello@auctionsgh.com" className="text-black underline">hello@auctionsgh.com</a>.</li>
            </ul>
        ),
    },
    {
        title: '8. Security',
        body: (
            <p>
                We use reasonable technical and organizational safeguards intended to protect personal data,
                including authenticated access controls, encrypted connections, and database security rules.
                No service can guarantee absolute security, so you should also protect your password, device,
                and account access.
            </p>
        ),
    },
    {
        title: '9. Children',
        body: (
            <p>
                AuctionsGH is not intended for children under 18. If you believe a minor has provided personal
                information to the platform, contact us and we will review the request.
            </p>
        ),
    },
    {
        title: '10. Changes To This Policy',
        body: (
            <p>
                We may update this Privacy Policy from time to time. When we do, we will update the date on this
                page. Continued use of the platform after a policy update means the updated version will apply.
            </p>
        ),
    },
];

export default function PrivacyPolicyPage() {
    const lastUpdated = 'March 9, 2026';

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="border border-gray-200 bg-white p-6 sm:p-8 mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Legal</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mt-3 max-w-2xl">
                    This policy explains what information AuctionsGH collects, how it is used, and the limited
                    cases where it is shared in connection with listings, bids, offers, chats, and order fulfillment.
                </p>
                <p className="text-xs text-gray-400 mt-4">Last updated: {lastUpdated}</p>
            </div>

            <div className="space-y-6">
                {sections.map((section) => (
                    <section key={section.title} className="border border-gray-200 bg-gray-50 p-5 sm:p-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-black mb-3">{section.title}</h2>
                        <div className="text-sm leading-7 text-gray-700">
                            {section.body}
                        </div>
                    </section>
                ))}

                <section className="border border-black bg-black text-white p-5 sm:p-6">
                    <h2 className="text-sm font-black uppercase tracking-widest mb-3">11. Contact</h2>
                    <p className="text-sm text-white/80 leading-7">
                        For privacy requests or questions, contact AuctionsGH at{' '}
                        <a href="mailto:hello@auctionsgh.com" className="text-white underline">hello@auctionsgh.com</a>,{' '}
                        call +233 257396067, or visit the <Link href="/contact" className="text-white underline">contact page</Link>.
                    </p>
                </section>
            </div>
        </div>
    );
}

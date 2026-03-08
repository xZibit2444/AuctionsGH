import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: "Privacy Policy for AuctionsGH — Ghana's Online Auction Marketplace. Learn how we handle your personal data.",
    robots: { index: true, follow: false },
    alternates: { canonical: `${SITE_URL}/privacy` },
    openGraph: {
        title: 'Privacy Policy | AuctionsGH',
        description: "How AuctionsGH handles your personal data — Ghana's Online Auction Marketplace.",
        url: `${SITE_URL}/privacy`,
        siteName: 'AuctionsGH',
    },
};

export default function PrivacyPolicyPage() {
    const lastUpdated = 'March 6, 2026';

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-black text-black tracking-tight mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-400 mb-10">Last updated: {lastUpdated}</p>

            <div className="prose prose-sm max-w-none space-y-8 text-gray-700 leading-relaxed">

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">1. Who We Are</h2>
                    <p>
                        AuctionsGH (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the AuctionsGH platform available at{' '}
                        <a href="https://auctions-gh-7nap.vercel.app" className="text-black underline">auctions-gh-7nap.vercel.app</a>{' '}
                        and the AuctionsGH mobile application. We are an online auction marketplace based in Ghana.
                        For any privacy-related questions, contact us at <strong>0257396067</strong>.
                    </p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">2. Information We Collect</h2>
                    <p>We collect the following types of information:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Account information:</strong> name, email address, phone number, and profile photo when you register.</li>
                        <li><strong>Transaction data:</strong> bids placed, auctions won, orders created, and payment-related information.</li>
                        <li><strong>Communications:</strong> messages sent through our in-app chat and offer system.</li>
                        <li><strong>Device information:</strong> device type, operating system, and app version when using our mobile app.</li>
                        <li><strong>Usage data:</strong> pages visited, features used, and interaction patterns to improve the platform.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">3. How We Use Your Information</h2>
                    <p>We use your information to:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Create and manage your account</li>
                        <li>Process bids, auctions, and orders</li>
                        <li>Send notifications about bids, auction results, and messages</li>
                        <li>Verify seller and buyer identities</li>
                        <li>Prevent fraud and ensure platform security</li>
                        <li>Provide customer support</li>
                        <li>Improve our services</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">4. How We Share Your Information</h2>
                    <p>We do <strong>not</strong> sell your personal information. We may share information with:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Other users:</strong> your username and listing information is visible to other users as part of the marketplace.</li>
                        <li><strong>Service providers:</strong> Supabase (database and authentication), Vercel (hosting), and Resend (email delivery) — all bound by data processing agreements.</li>
                        <li><strong>Legal authorities:</strong> when required by law or to prevent fraud.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">5. Data Retention</h2>
                    <p>
                        We retain your account data for as long as your account is active. If you delete your account,
                        we will remove your personal data within 30 days, except where we are required to retain it
                        for legal or fraud prevention purposes.
                    </p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">6. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Access the personal data we hold about you</li>
                        <li>Request correction of inaccurate data</li>
                        <li>Request deletion of your account and data</li>
                        <li>Opt out of non-essential communications</li>
                    </ul>
                    <p className="mt-2">To exercise any of these rights, contact us at <strong>0257396067</strong>.</p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">7. Security</h2>
                    <p>
                        We use industry-standard security measures including encrypted connections (HTTPS),
                        secure authentication via Supabase, and row-level security on all database access.
                        However, no system is 100% secure and we cannot guarantee absolute security.
                    </p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">8. Children&apos;s Privacy</h2>
                    <p>
                        AuctionsGH is not intended for users under the age of 18. We do not knowingly collect
                        personal information from children. If you believe a child has provided us with personal
                        information, contact us at <strong>0257396067</strong> and we will delete it.
                    </p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">9. Third-Party Links</h2>
                    <p>
                        Our platform may contain links to third-party websites. We are not responsible for
                        the privacy practices of those sites and encourage you to review their privacy policies.
                    </p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">10. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of significant
                        changes by posting the new policy on this page with an updated date.
                        Continued use of AuctionsGH after changes constitutes acceptance of the updated policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-base font-black text-black uppercase tracking-widest mb-3">11. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy or how we handle your data:</p>
                    <div className="mt-2 p-4 border border-gray-200 bg-gray-50">
                        <p><strong>AuctionsGH</strong></p>
                        <p>Ghana&apos;s Online Auction Marketplace</p>
                        <p className="mt-1">📞 <strong>0257396067</strong></p>
                        <p>🌐 <a href="https://auctions-gh-7nap.vercel.app" className="text-black underline">auctions-gh-7nap.vercel.app</a></p>
                    </div>
                </section>

            </div>
        </div>
    );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import SellerStats from '@/components/dashboard/SellerStats';
import ListingTable from '@/components/dashboard/ListingTable';
import BuyerStats from '@/components/dashboard/BuyerStats';
import Link from 'next/link';
import { Settings, Plus, ChevronRight, Store, ClipboardList, Package, BarChart3, Ban, Gavel, Newspaper, Mail, LifeBuoy } from 'lucide-react';

const adminShortcuts = [
    { href: '/admin/analytics', title: 'Analytics', sub: 'GMV, funnels, seller performance, and trust alerts.', icon: BarChart3 },
    { href: '/admin/applications', title: 'Seller Applications', sub: 'Review and approve pending seller applications.', icon: ClipboardList },
    { href: '/admin/orders', title: 'Order Monitor', sub: 'See all orders, delivery codes, and live statuses.', icon: Package },
    { href: '/admin/users', title: 'User Moderation', sub: 'Permanently ban abusive or fraudulent accounts.', icon: Ban },
    { href: '/admin/auctions', title: 'Auction Management', sub: 'Edit, unpublish, force-end, or extend any listing.', icon: Gavel },
    { href: '/admin/support', title: 'Support Requests', sub: 'Read and resolve issues sent from Contact Support.', icon: LifeBuoy },
    { href: '/admin/news', title: 'News & Announcements', sub: 'Post and manage news items shown on /news.', icon: Newspaper },
    { href: '/admin/newsletter', title: 'Send Newsletter', sub: 'Email news updates to all subscribers.', icon: Mail },
];

function SectionHeading({ title, linkHref, linkLabel }: { title: string; linkHref: string; linkLabel: string }) {
    return (
        <div className="flex items-baseline justify-between mb-4 px-0.5">
            <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.16em]">{title}</h2>
            <Link href={linkHref} className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors">
                {linkLabel}
            </Link>
        </div>
    );
}

export default function DashboardPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [loading, user, router]);

    // Render the page shell immediately — only redirect if definitely not logged in
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-12">

                {/* Hero */}
                <div className="relative overflow-hidden mb-8 sm:mb-10">
                    <div className="pointer-events-none absolute -inset-x-10 -top-24 h-56 bg-[radial-gradient(closest-side,rgba(251,191,36,0.28),transparent_70%)]" />
                    <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Account Center</p>
                            <h1 className="mt-2.5 text-3xl sm:text-4xl font-black tracking-tight text-black">Dashboard</h1>
                            <p className="mt-2.5 text-sm sm:text-[15px] text-gray-500 leading-6">
                                Your activity overview - listings, offers, and orders in one place.
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <Link
                                href="/settings"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-black hover:border-gray-400 transition-colors"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                            {user && !profile?.is_banned && (
                                <Link
                                    href="/auctions/create"
                                    className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>New listing</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Store management — super admin only */}
                {profile?.is_super_admin && (
                    <section className="mb-8 sm:mb-10">
                        <SectionHeading title="Store management" linkHref="/admin/analytics" linkLabel="Open analytics" />
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {adminShortcuts.map(({ href, title, sub, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 hover:border-amber-400/60 transition-colors"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-700">
                                        <Icon className="h-4 w-4" strokeWidth={1.9} />
                                    </span>
                                    <span>
                                        <span className="flex items-center gap-1 text-sm font-extrabold text-black">
                                            {title}
                                            <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-amber-600 transition-colors" />
                                        </span>
                                        <span className="block text-[11.5px] text-gray-400 mt-1 leading-snug">{sub}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Live listings control — super admin only */}
                {profile?.is_super_admin && (
                    <section className="mb-8 sm:mb-10">
                        <SectionHeading title="Live Listings Control" linkHref="/auctions" linkLabel="Browse all" />
                        <p className="text-xs text-gray-400 -mt-2.5 mb-4 px-0.5">Super admins can remove active listings directly from the dashboard.</p>
                        <div className="rounded-[20px] border border-gray-200 bg-white overflow-hidden">
                            <ListingTable adminMode status="active" />
                        </div>
                    </section>
                )}

                {/* Selling */}
                <section className="mb-8 sm:mb-10">
                    <SectionHeading title="Selling" linkHref="/auctions" linkLabel="Browse all listings" />
                    <div className="mb-4">
                        <SellerStats />
                    </div>
                    <div className="rounded-[20px] border border-gray-200 bg-white overflow-hidden">
                        <ListingTable />
                    </div>
                </section>

                {/* Buying */}
                <section>
                    <SectionHeading title="Buying" linkHref="/auctions" linkLabel="Browse auctions" />
                    <BuyerStats />
                </section>
            </div>
        </div>
    );
}

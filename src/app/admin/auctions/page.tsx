import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils';
import AdminAuctionsClient from '@/components/admin/AdminAuctionsClient';
import { ShieldCheck, Gavel } from 'lucide-react';
import Link from 'next/link';

export interface AdminAuctionRow {
    id: string;
    title: string;
    status: string;
    starting_price: number;
    current_price: number;
    bid_count: number;
    condition: string;
    listing_city: string;
    ends_at: string;
    created_at: string;
    seller: { id: string; full_name: string | null; username: string | null } | null;
    auction_images: { url: string }[] | null;
}

export default async function AdminAuctionsPage() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };

    if (!profile?.is_super_admin) redirect('/');

    const { data, error } = await admin
        .from('auctions')
        .select(`
            id, title, status, starting_price, current_price,
            bid_count, condition, listing_city, ends_at, created_at,
            seller:profiles!auctions_seller_id_fkey ( id, full_name, username ),
            auction_images ( url )
        `)
        .order('created_at', { ascending: false })
        .limit(200) as { data: AdminAuctionRow[] | null; error: unknown };

    const auctions = data ?? [];

    const stats = {
        total: auctions.length,
        active: auctions.filter((a) => a.status === 'active').length,
        sold: auctions.filter((a) => a.status === 'sold').length,
        ended: auctions.filter((a) => a.status === 'ended').length,
        cancelled: auctions.filter((a) => a.status === 'cancelled').length,
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest mb-3">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Superior Admin Only
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-3">
                        <Gavel className="h-7 w-7" />
                        Auction Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Unpublish, force-end, extend, edit, or delete any listing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/orders" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors">
                        Orders
                    </Link>
                    <Link href="/admin/analytics" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors">
                        Analytics
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                {[
                    { label: 'Total', value: stats.total, color: 'text-black' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-700' },
                    { label: 'Sold', value: stats.sold, color: 'text-blue-700' },
                    { label: 'Ended', value: stats.ended, color: 'text-gray-500' },
                    { label: 'Cancelled', value: stats.cancelled, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {error ? (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to load auctions.
                </div>
            ) : (
                <AdminAuctionsClient auctions={auctions} formatCurrency={formatCurrency} />
            )}
        </div>
    );
}

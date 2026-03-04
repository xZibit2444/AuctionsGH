import AuthGuard from '@/components/auth/AuthGuard';
import SellerStats from '@/components/dashboard/SellerStats';
import ListingTable from '@/components/dashboard/ListingTable';
import Link from 'next/link';
import { Settings, Plus } from 'lucide-react';

export const metadata = {
    title: 'Dashboard — AuctionsGH',
};

export default function DashboardPage() {
    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                {/* Header */}
                <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">Dashboard</h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your seller overview</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href="/settings"
                            className="p-2 border border-gray-200 text-gray-500 hover:border-black hover:text-black transition-colors"
                            title="Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/auctions/create"
                            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-black text-white text-xs sm:text-sm font-semibold hover:bg-gray-900 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden xs:inline">New</span> Listing
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="border border-gray-200 mb-6 sm:mb-8">
                    <SellerStats />
                </div>

                {/* Listings */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-black text-black uppercase tracking-widest">My Listings</h2>
                        <Link
                            href="/auctions"
                            className="text-xs font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                        >
                            Browse all
                        </Link>
                    </div>
                    <div className="border border-gray-200 overflow-hidden">
                        <ListingTable />
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}

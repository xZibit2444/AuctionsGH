'use client';

import { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import SellerStats from '@/components/dashboard/SellerStats';
import ListingTable from '@/components/dashboard/ListingTable';
import BuyerStats from '@/components/dashboard/BuyerStats';
import Link from 'next/link';
import { Settings, Plus } from 'lucide-react';

type Tab = 'buyer' | 'seller';

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<Tab>('buyer');

    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
                {/* Header */}
                <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">Dashboard</h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your activity overview</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href="/settings"
                            className="p-2 border border-gray-200 text-gray-500 hover:border-black hover:text-black transition-colors"
                            title="Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                        {activeTab === 'seller' && (
                            <Link
                                href="/auctions/create"
                                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-black text-white text-xs sm:text-sm font-semibold hover:bg-gray-900 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span>New Listing</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-gray-200 mb-6 sm:mb-8">
                    {([
                        { id: 'buyer' as Tab, label: 'Buyer' },
                        { id: 'seller' as Tab, label: 'Seller' },
                    ]).map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`px-5 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${activeTab === id
                                    ? 'border-black text-black'
                                    : 'border-transparent text-gray-400 hover:text-black'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'buyer' ? (
                    <BuyerStats />
                ) : (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Seller Stats Grid */}
                        <div className="border border-gray-200">
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
                )}
            </div>
        </AuthGuard>
    );
}

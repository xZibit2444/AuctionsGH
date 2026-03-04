'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { Package, Zap, CheckSquare, TrendingUp } from 'lucide-react';

interface Stats {
    totalListings: number;
    activeListings: number;
    totalSold: number;
    totalRevenue: number;
}

const statCards = (stats: Stats) => [
    {
        label: 'Total Listings',
        value: stats.totalListings.toString(),
        icon: Package,
    },
    {
        label: 'Active',
        value: stats.activeListings.toString(),
        icon: Zap,
    },
    {
        label: 'Sold',
        value: stats.totalSold.toString(),
        icon: CheckSquare,
    },
    {
        label: 'Revenue',
        value: formatCurrency(stats.totalRevenue),
        icon: TrendingUp,
    },
];

export default function SellerStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalListings: 0,
        activeListings: 0,
        totalSold: 0,
        totalRevenue: 0,
    });

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('auctions')
                .select('status, current_price')
                .eq('seller_id', user.id);

            const auctions = (data ?? []) as { status: string; current_price: number }[];
            setStats({
                totalListings: auctions.length,
                activeListings: auctions.filter((a) => a.status === 'active').length,
                totalSold: auctions.filter((a) => a.status === 'sold').length,
                totalRevenue: auctions
                    .filter((a) => a.status === 'sold')
                    .reduce((sum, a) => sum + a.current_price, 0),
            });
        };

        fetchStats();
    }, [user]);

    const cards = statCards(stats);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">

            {cards.map(({ label, value, icon: Icon }) => (
                <div
                    key={label}
                    className="bg-white p-6"
                >
                    <Icon className="h-4 w-4 text-gray-400 mb-4" strokeWidth={1.5} />
                    <p className="text-3xl font-black text-black tracking-tight mb-1">{value}</p>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
                </div>
            ))}
        </div>
    );
}

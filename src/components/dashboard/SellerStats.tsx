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

        let isMounted = true;
        const fetchStats = async () => {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('auctions')
                    .select('status, current_price')
                    .eq('seller_id', user.id);

                if (!isMounted) return;
                const auctions = (data ?? []) as { status: string; current_price: number }[];
                setStats({
                    totalListings: auctions.length,
                    activeListings: auctions.filter((a) => a.status === 'active').length,
                    totalSold: auctions.filter((a) => a.status === 'sold').length,
                    totalRevenue: auctions
                        .filter((a) => a.status === 'sold')
                        .reduce((sum, a) => sum + a.current_price, 0),
                });
            } catch {
                // silently fall through — stats stay at defaults
            }
        };

        fetchStats();
        return () => { isMounted = false; };
    }, [user]);

    const cards = statCards(stats);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map(({ label, value, icon: Icon }, index) => (
                <div
                    key={label}
                    className={`rounded-2xl border p-5 sm:p-6 ${index === 0 ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl mb-4 ${index === 0 ? 'bg-amber-400/20 text-amber-400' : 'bg-amber-400/20 text-amber-700'}`}>
                        <Icon className="h-4 w-4" strokeWidth={1.9} />
                    </span>
                    <p className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${index === 0 ? 'text-white' : 'text-black'}`}>{value}</p>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${index === 0 ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
                </div>
            ))}
        </div>
    );
}

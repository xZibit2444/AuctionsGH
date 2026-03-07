'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import Skeleton from '@/components/ui/Skeleton';

interface OrderRow {
    id: string;
    status: string;
    created_at: string;
    auction: { id: string; title: string; current_price: number } | null;
}

export default function WonAuctionsList() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchOrders = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('orders')
                .select('id, status, created_at, auction:auctions(id, title, current_price)')
                .eq('buyer_id', user.id)
                .order('created_at', { ascending: false });

            setOrders((data as OrderRow[]) ?? []);
            setLoading(false);
        };

        fetchOrders();
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🏆</span>
                <p className="text-gray-500">You haven&apos;t won any auctions yet.</p>
                <Link href="/auctions" className="text-emerald-600 font-medium hover:underline mt-2 inline-block">
                    Browse auctions →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {orders.map((order) => (
                <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block p-5 bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 hover:-translate-y-0.5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900">{order.auction?.title ?? 'Order'}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {formatCurrency(order.auction?.current_price ?? 0)}
                            </p>
                        </div>
                        <span className="text-2xl">🏆</span>
                    </div>
                </Link>
            ))}
        </div>
    );
}

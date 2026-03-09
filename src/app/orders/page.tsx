'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPrimaryDelivery } from '@/lib/delivery';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Package, MessageCircle, ChevronRight } from 'lucide-react';

interface OrderRow {
    id: string;
    status: string;
    created_at: string;
    buyer_id: string;
    seller_id: string;
    auction: {
        id: string;
        title: string;
        current_price: number;
        auction_images: { url: string; position: number }[];
    } | null;
    deliveries: { status: string }[] | { status: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    sent: 'bg-blue-50 text-blue-700',
    delivered: 'bg-purple-50 text-purple-700',
    completed: 'bg-emerald-50 text-emerald-700',
    pin_verified: 'bg-emerald-50 text-emerald-700',
    void: 'bg-red-50 text-red-600',
};

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (authLoading) return; // wait for auth to resolve first
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                    id, status, created_at, buyer_id, seller_id,
                    auction:auctions ( id, title, current_price, auction_images(url, position) ),
                    deliveries ( status )
                `)
                    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                if (error) console.error('[orders] fetch error:', error);
                setOrders((data as OrderRow[]) ?? []);
            } catch (err) {
                console.error('[orders] unexpected error:', err);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user, authLoading]);

    const getDeliveryStatus = (order: OrderRow) => {
        return getPrimaryDelivery(order.deliveries)?.status ?? order.status;
    };

    const getStatusLabel = (order: OrderRow) => {
        const s = order.status === 'completed' || order.status === 'pin_verified'
            ? 'completed'
            : getDeliveryStatus(order);
        return s.replace('_', ' ');
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">My Orders</h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">All your orders — purchases and sales</p>
            </div>

            {loading ? (
                <div className="border border-gray-200 divide-y divide-gray-100">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4">
                            <div className="h-12 w-12 bg-gray-100 skeleton-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-100 skeleton-pulse w-2/3" />
                                <div className="h-3 bg-gray-100 skeleton-pulse w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 border border-gray-200">
                    <Package className="mx-auto h-10 w-10 text-gray-300 mb-4" strokeWidth={1} />
                    <h3 className="text-sm font-bold text-black uppercase tracking-widest">No orders yet</h3>
                    <p className="text-xs text-gray-400 mt-1 mb-6">Win an auction to get started.</p>
                    <Link
                        href="/auctions"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                    >
                        Browse Auctions
                    </Link>
                </div>
            ) : (
                <div className="border border-gray-200 divide-y divide-gray-100">
                    {orders.map((order) => {
                        const images = order.auction?.auction_images ?? [];
                        const thumb = images.sort((a, b) => a.position - b.position)[0]?.url;
                        const statusKey = order.status === 'completed' || order.status === 'pin_verified'
                            ? 'completed'
                            : getDeliveryStatus(order);
                        const statusColor = STATUS_COLORS[statusKey] ?? 'bg-gray-100 text-gray-500';
                        const isBuyer = order.buyer_id === user?.id;

                        return (
                            <div key={order.id} className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors">
                                {/* Thumbnail */}
                                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gray-100 shrink-0 overflow-hidden">
                                    {thumb ? (
                                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Package className="h-5 w-5 text-gray-300" strokeWidth={1} />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-black truncate">
                                            {order.auction?.title ?? 'Order'}
                                        </p>
                                        <span className={`shrink-0 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                                            isBuyer ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                            {isBuyer ? 'Bought' : 'Sold'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-xs font-mono font-semibold text-gray-500">
                                            {formatCurrency(order.auction?.current_price ?? 0)}
                                        </span>
                                        <span className="text-gray-200">·</span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Status + actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                                        {getStatusLabel(order)}
                                    </span>
                                    <Link
                                        href={`/orders/${order.id}#chat`}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Open chat"
                                    >
                                        <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                                    </Link>
                                    <Link
                                        href={`/orders/${order.id}`}
                                        className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                                        title="View order"
                                    >
                                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

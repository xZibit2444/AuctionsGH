'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { getPrimaryDelivery } from '@/lib/delivery';
import Avatar from '@/components/ui/Avatar';
import { ChevronRight, Package, ShoppingBag, Store } from 'lucide-react';

type ProfileTab = 'buying' | 'selling';

interface ProfileOrderRow {
    id: string;
    status: string;
    created_at: string;
    buyer_id: string;
    seller_id: string;
    auction: {
        id: string;
        title: string;
        current_price: number;
        auction_images: { url: string; position: number }[] | null;
    } | null;
    buyer: {
        id: string;
        full_name: string | null;
        username: string | null;
    } | null;
    seller: {
        id: string;
        full_name: string | null;
        username: string | null;
    } | null;
    deliveries: { status: string }[] | { status: string } | null;
}

function getDisplayName(person: { full_name: string | null; username: string | null } | null, fallback: string) {
    return person?.full_name || person?.username || fallback;
}

export default function ProfilePage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [tab, setTab] = useState<ProfileTab>('buying');
    const [orders, setOrders] = useState<ProfileOrderRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (authLoading) return;
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
                        id,
                        status,
                        created_at,
                        buyer_id,
                        seller_id,
                        auction:auctions (
                            id,
                            title,
                            current_price,
                            auction_images(url, position)
                        ),
                        buyer:profiles!orders_buyer_id_fkey (
                            id,
                            full_name,
                            username
                        ),
                        seller:profiles!orders_seller_id_fkey (
                            id,
                            full_name,
                            username
                        ),
                        deliveries ( status )
                    `)
                    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('[profile] fetch orders error:', error);
                    setOrders([]);
                    return;
                }

                const successfulOrders = ((data as ProfileOrderRow[]) ?? []).filter((order) => {
                    const deliveryStatus = getPrimaryDelivery(order.deliveries)?.status;
                    return ['completed', 'pin_verified'].includes(order.status)
                        || ['completed', 'delivered'].includes(deliveryStatus ?? '');
                });

                setOrders(successfulOrders);
            } catch (error) {
                console.error('[profile] unexpected error:', error);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        void fetchOrders();
    }, [authLoading, user]);

    const buyingOrders = useMemo(
        () => orders.filter((order) => order.buyer_id === user?.id),
        [orders, user]
    );
    const sellingOrders = useMemo(
        () => orders.filter((order) => order.seller_id === user?.id),
        [orders, user]
    );

    const visibleOrders = tab === 'buying' ? buyingOrders : sellingOrders;
    const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Your profile';

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-24 sm:pb-10">
            <div className="mb-8 flex flex-col gap-4 border border-gray-200 bg-white p-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                    <Avatar
                        src={profile?.avatar_url}
                        name={displayName}
                        size="lg"
                        className="shrink-0 ring-0"
                    />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">Profile</p>
                        <h1 className="mt-2 text-2xl font-black tracking-tight text-black sm:text-3xl">{displayName}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-gray-500">
                            Review your successful purchases and completed sales in one place.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
                    <div className="border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Successful buys</p>
                        <p className="mt-2 text-2xl font-black text-black">{buyingOrders.length}</p>
                    </div>
                    <div className="border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Successful sales</p>
                        <p className="mt-2 text-2xl font-black text-black">{sellingOrders.length}</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <button
                    onClick={() => setTab('buying')}
                    className={`inline-flex items-center gap-2 border px-4 py-2.5 text-sm font-bold transition-colors ${
                        tab === 'buying'
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'
                    }`}
                >
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                    Successful buys
                </button>
                <button
                    onClick={() => setTab('selling')}
                    className={`inline-flex items-center gap-2 border px-4 py-2.5 text-sm font-bold transition-colors ${
                        tab === 'selling'
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'
                    }`}
                >
                    <Store className="h-4 w-4" strokeWidth={1.75} />
                    Successful sales
                </button>
            </div>

            {loading ? (
                <div className="divide-y divide-gray-100 border border-gray-200 bg-white">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-4 px-5 py-4">
                            <div className="h-14 w-14 shrink-0 bg-gray-100 skeleton-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 bg-gray-100 skeleton-pulse" />
                                <div className="h-3 w-1/3 bg-gray-100 skeleton-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : visibleOrders.length === 0 ? (
                <div className="border border-gray-200 bg-white py-20 text-center">
                    <Package className="mx-auto mb-4 h-10 w-10 text-gray-300" strokeWidth={1} />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-black">
                        {tab === 'buying' ? 'No successful buys yet' : 'No successful sales yet'}
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                        {tab === 'buying'
                            ? 'Completed purchases will appear here after your orders are finished.'
                            : 'Completed sales will appear here after buyers finish the order.'}
                    </p>
                    <Link
                        href={tab === 'buying' ? '/auctions' : '/dashboard'}
                        className="mt-6 inline-flex items-center gap-2 bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
                    >
                        {tab === 'buying' ? 'Browse auctions' : 'Open dashboard'}
                    </Link>
                </div>
            ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 bg-white">
                    {visibleOrders.map((order) => {
                        const thumbnail = [...(order.auction?.auction_images ?? [])]
                            .sort((a, b) => a.position - b.position)[0]?.url;
                        const counterpart = tab === 'buying'
                            ? getDisplayName(order.seller, 'Seller')
                            : getDisplayName(order.buyer, 'Buyer');
                        const counterpartId = tab === 'buying' ? order.seller?.id : order.buyer?.id;

                        return (
                            <div key={order.id} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 sm:px-5">
                                <div className="h-14 w-14 shrink-0 overflow-hidden bg-gray-100">
                                    {thumbnail ? (
                                        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package className="h-5 w-5 text-gray-300" strokeWidth={1} />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-black">
                                            {order.auction?.title ?? 'Completed order'}
                                        </p>
                                        <span className="bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                            Completed
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span>
                                            {tab === 'buying' ? 'Bought from ' : 'Sold to '}
                                            {counterpartId ? (
                                                <Link href={`/users/${counterpartId}`} className="font-semibold text-black hover:underline underline-offset-2">
                                                    {counterpart}
                                                </Link>
                                            ) : (
                                                counterpart
                                            )}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-black text-black">
                                        {formatCurrency(order.auction?.current_price ?? 0)}
                                    </p>
                                    <Link
                                        href={`/orders/${order.id}`}
                                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-black"
                                    >
                                        View order
                                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
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

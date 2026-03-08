import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardList, Package, ShieldCheck, Truck, User, CheckCircle2, Circle } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency } from '@/lib/utils';

interface AdminOrderRow {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: string;
    payment_method: string | null;
    fulfillment_type: string | null;
    meetup_location: string | null;
    created_at: string;
    updated_at: string | null;
    auction: {
        id: string;
        title: string;
    } | null;
    buyer: {
        id: string;
        full_name: string | null;
        phone_number: string | null;
    } | null;
    seller: {
        id: string;
        full_name: string | null;
        phone_number: string | null;
        location: string | null;
    } | null;
    deliveries: {
        id: string;
        status: string;
        delivery_code: string | null;
        delivered_at: string | null;
        created_at: string | null;
    }[] | null;
}

interface OrdersQueryClient {
    from: (table: 'orders') => {
        select: (query: string) => {
            order: (
                column: 'created_at',
                options: { ascending: boolean }
            ) => Promise<{ data: unknown; error: unknown }>;
        };
    };
}

function statusTone(status: string) {
    if (status === 'completed' || status === 'pin_verified') {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }

    if (status.includes('pending')) {
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }

    if (status === 'sent' || status === 'delivered') {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }

    return 'bg-gray-50 text-gray-700 border-gray-200';
}

function prettyStatus(value: string | null | undefined) {
    if (!value) return 'Unknown';
    return value.replace(/_/g, ' ');
}

function PersonBlock({
    label,
    person,
    location,
}: {
    label: string;
    person: { full_name: string | null; phone_number: string | null } | null;
    location?: string | null;
}) {
    return (
        <div className="border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
            <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-black">
                        {person?.full_name || 'Unnamed user'}
                    </p>
                    <p className="text-xs text-gray-500">
                        {person?.phone_number || 'No phone number'}
                    </p>
                    {location && (
                        <p className="text-xs text-gray-500">
                            {location}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default async function AdminOrdersPage() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_super_admin) {
        redirect('/');
    }

    const admin = createAdminClient() as unknown as OrdersQueryClient;
    const { data, error } = await admin
        .from('orders')
        .select(`
            id,
            auction_id,
            buyer_id,
            seller_id,
            amount,
            status,
            payment_method,
            fulfillment_type,
            meetup_location,
            created_at,
            updated_at,
            auction:auctions ( id, title ),
            buyer:profiles!orders_buyer_id_fkey ( id, full_name, phone_number ),
            seller:profiles!orders_seller_id_fkey ( id, full_name, phone_number, location ),
            deliveries!deliveries_order_id_fkey ( id, status, delivery_code, delivered_at, created_at )
        `)
        .order('created_at', { ascending: false });

    const orders = ((data ?? []) as AdminOrderRow[]).map((order) => ({
        ...order,
        delivery: Array.isArray(order.deliveries) ? order.deliveries[0] ?? null : null,
    }));

    const activeOrders = orders.filter((order) => {
        const deliveryStatus = order.delivery?.status ?? '';
        return order.status !== 'completed' && order.status !== 'pin_verified' && deliveryStatus !== 'completed';
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <div className="flex items-start sm:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest mb-3">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Superior Admin Only
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">All Orders Monitor</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Track every order, delivery code, seller confirmation state, and final status in one place.
                    </p>
                </div>
                <Link
                    href="/admin/applications"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors"
                >
                    <ClipboardList className="h-4 w-4" />
                    Seller Applications
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Orders</p>
                    <p className="text-3xl font-black text-black">{orders.length}</p>
                </div>
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Active / In Progress</p>
                    <p className="text-3xl font-black text-black">{activeOrders.length}</p>
                </div>
                <div className="border border-gray-200 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Completed</p>
                    <p className="text-3xl font-black text-black">{orders.length - activeOrders.length}</p>
                </div>
            </div>

            {error ? (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to load admin orders.
                </div>
            ) : orders.length === 0 ? (
                <div className="border border-gray-200 bg-white p-12 text-center">
                    <Package className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-lg font-black text-black">No orders yet</h2>
                    <p className="text-sm text-gray-400 mt-1">When buyers complete checkout, the orders will appear here.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {orders.map((order) => {
                        const delivery = order.delivery;
                        const sellerConfirmedCode = delivery?.status === 'delivered' || delivery?.status === 'completed';
                        const orderStatus = prettyStatus(order.status);
                        const deliveryStatus = prettyStatus(delivery?.status);

                        return (
                            <section key={order.id} className="border border-gray-200 bg-white overflow-hidden">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h2 className="text-lg font-black text-black">
                                                Order #{order.id.split('-')[0].toUpperCase()}
                                            </h2>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest ${statusTone(order.status)}`}>
                                                <Circle className="h-2.5 w-2.5 fill-current" />
                                                {orderStatus}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest ${statusTone(delivery?.status ?? 'unknown')}`}>
                                                <Truck className="h-3 w-3" />
                                                {deliveryStatus}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-black">
                                            {order.auction?.title || 'Untitled auction'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Created {new Date(order.created_at).toLocaleString('en-GH')}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/orders/${order.id}`}
                                            className="inline-flex items-center justify-center px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-colors"
                                        >
                                            Open Order
                                        </Link>
                                        <Link
                                            href={`/auctions/${order.auction_id}`}
                                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-700 hover:border-black hover:text-black transition-colors"
                                        >
                                            View Auction
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 p-5">
                                    <div className="xl:col-span-2 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <PersonBlock label="Buyer" person={order.buyer} />
                                            <PersonBlock label="Seller" person={order.seller} location={order.seller?.location} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="border border-gray-200 bg-gray-50 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Order Details</p>
                                                <dl className="space-y-2 text-sm">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Amount</dt>
                                                        <dd className="font-black text-black">{formatCurrency(order.amount)}</dd>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Payment</dt>
                                                        <dd className="font-semibold text-black">{prettyStatus(order.payment_method)}</dd>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Fulfillment</dt>
                                                        <dd className="font-semibold text-black">{prettyStatus(order.fulfillment_type)}</dd>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Meetup / Address</dt>
                                                        <dd className="font-semibold text-black text-right max-w-[16rem]">{order.meetup_location || '-'}</dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <div className="border border-gray-200 bg-gray-50 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Code Tracking</p>
                                                <dl className="space-y-2 text-sm">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Delivery code</dt>
                                                        <dd className="font-mono font-black text-black">{delivery?.delivery_code || 'Not generated'}</dd>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Seller entered code</dt>
                                                        <dd className={sellerConfirmedCode ? 'font-black text-emerald-700' : 'font-black text-amber-700'}>
                                                            {sellerConfirmedCode ? 'Yes' : 'No'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <dt className="text-gray-500">Code used at</dt>
                                                        <dd className="font-semibold text-black text-right">
                                                            {delivery?.delivered_at ? new Date(delivery.delivered_at).toLocaleString('en-GH') : 'Not yet'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 bg-black text-white p-5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-4">Live Status Snapshot</p>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-white/70 text-sm">Order status</span>
                                                <span className="text-sm font-black uppercase tracking-widest">{orderStatus}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-white/70 text-sm">Delivery status</span>
                                                <span className="text-sm font-black uppercase tracking-widest">{deliveryStatus}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-white/70 text-sm">Delivery record</span>
                                                <span className="text-sm font-black uppercase tracking-widest">{delivery ? 'Present' : 'Missing'}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-white/70 text-sm">Seller code confirm</span>
                                                <span className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-widest">
                                                    {sellerConfirmedCode ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                    ) : (
                                                        <Circle className="h-3.5 w-3.5 text-amber-300 fill-current" />
                                                    )}
                                                    {sellerConfirmedCode ? 'Done' : 'Waiting'}
                                                </span>
                                            </div>
                                            <div className="pt-3 border-t border-white/10 text-xs text-white/60 leading-relaxed">
                                                Updated {new Date(order.updated_at || order.created_at).toLocaleString('en-GH')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, getUserDisplayLabel } from '@/lib/utils';
import { ShieldCheck, Package, Truck, CheckCircle2, ArrowUpRight, MapPin, Download } from 'lucide-react';
import Link from 'next/link';
import DeliveryCodeDisplay from '@/components/delivery/DeliveryCodeDisplay';
import DeliveryConfirmationForm from '@/components/delivery/DeliveryConfirmationForm';
import OrderChat from '@/components/order/OrderChat';
import ReviewForm from '@/components/order/ReviewForm';
import OrderCancellationPanel from '@/components/order/OrderCancellationPanel';
import { getPrimaryDelivery } from '@/lib/delivery';
import Avatar from '@/components/ui/Avatar';
import SellerRating from '@/components/ui/SellerRating';
import FavoriteSellerButton from '@/components/seller/FavoriteSellerButton';
import ShareButton from '@/components/ui/ShareButton';
import type { DeliveryStatus } from '@/types/delivery';
import { formatOrderStatusLabel, getOrderSurfaceStatus, isCancelledOrderStatus, isCompletedOrderStatus, isTerminalOrderStatus } from '@/lib/orderStatus';

interface OrderPageProps {
    params: Promise<{ id: string }>;
}

type OrderParty = {
    id: string;
    avatar_url?: string | null;
    username?: string | null;
    full_name: string | null;
    phone_number: string | null;
    location?: string | null;
    is_verified?: boolean;
};

type OrderPageData = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: string;
    cancellation_reason?: string | null;
    cancelled_at?: string | null;
    created_at: string;
    fulfillment_type: string | null;
    meetup_location: string | null;
    buyer: OrderParty | null;
    seller: OrderParty | null;
    auction: {
        id: string;
        title: string;
        current_price: number;
        condition: string | null;
        auction_images: { url: string }[] | null;
        auction_winner_notes?: { note: string }[] | { note: string } | null;
    } | null;
    deliveries?: { id: string; status: string; delivered_at?: string | null }[] | { id: string; status: string; delivered_at?: string | null } | null;
};

const STATUS_STEPS: { key: DeliveryStatus; label: string }[] = [
    { key: 'pending', label: 'Order Placed' },
    { key: 'sent', label: 'Sent' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
];

function DeliveryTimeline({ status }: { status: DeliveryStatus }) {
    const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

    return (
        <div className="border border-gray-200 p-6 bg-white">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Delivery Status</h3>
            <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                {STATUS_STEPS.map((step, idx) => {
                    const done = idx <= currentIdx;
                    const active = idx === currentIdx;

                    return (
                        <li key={step.key} className="ml-4">
                            <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${done ? 'bg-black' : 'bg-gray-200'}`}>
                                {done ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                ) : (
                                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                )}
                            </span>
                            <p className={`text-sm font-bold ml-1 ${active ? 'text-black' : done ? 'text-gray-600' : 'text-gray-300'}`}>
                                {step.label}
                                {active && (
                                    <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5">
                                        Current
                                    </span>
                                )}
                            </p>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

export default function OrderPage({ params }: OrderPageProps) {
    const { id } = use(params);
    const { user, loading: authLoading } = useAuth();
    const [order, setOrder] = useState<OrderPageData | null>(null);
    const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending');
    const [loading, setLoading] = useState(true);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [sellerListings, setSellerListings] = useState<{ id: string; title: string; current_price: number; condition: string | null; auction_images: { url: string }[] | null }[]>([]);

    useEffect(() => {
        if (!order?.seller_id || !order?.auction_id) return;
        const supabase = createClient();
        supabase
            .from('auctions')
            .select('id, title, current_price, condition, auction_images(url)')
            .eq('seller_id', order.seller_id)
            .eq('status', 'active')
            .neq('id', order.auction_id)
            .order('created_at', { ascending: false })
            .limit(6)
            .then(({ data }) => {
                if (data) setSellerListings(data as any);
            });
    }, [order?.seller_id, order?.auction_id]);

    useEffect(() => {
        let isMounted = true;
        const fetchOrder = async (retryCount = 0) => {
            // Auth not ready yet — wait for it via the effect dependency, don't count as a retry
            if (authLoading) return;
            if (!user) {
                if (isMounted) setLoading(false);
                return;
            }

            const supabase = createClient();
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    auction:auctions ( id, title, current_price, condition, auction_images(url), auction_winner_notes(note) ),
                    buyer:profiles!orders_buyer_id_fkey ( id, avatar_url, username, full_name, phone_number, location, is_verified ),
                    seller:profiles!orders_seller_id_fkey ( id, avatar_url, username, full_name, phone_number, location, is_verified ),
                    deliveries!deliveries_order_id_fkey ( id, status, delivered_at )
                `)
                .eq('id', id)
                .single();

            if (!isMounted) return;

            if (!error && data) {
                const nextOrder = data as OrderPageData;
                setOrder(nextOrder);
                const dels = Array.isArray(nextOrder.deliveries)
                    ? nextOrder.deliveries
                    : nextOrder.deliveries
                        ? [nextOrder.deliveries]
                        : [];

                const primaryDelivery = getPrimaryDelivery(dels);
                if (primaryDelivery) {
                    setDeliveryStatus(primaryDelivery.status as DeliveryStatus);
                }

                // Check if user already reviewed this order
                const { data: existing } = await supabase
                    .from('user_reviews')
                    .select('id')
                    .eq('order_id', id)
                    .eq('reviewer_id', user!.id)
                    .maybeSingle();
                if (isMounted) setHasReviewed(!!existing);

                setLoading(false);
                return;
            }

            if (retryCount < 3) {
                setTimeout(() => fetchOrder(retryCount + 1), 200);
            } else if (isMounted) {
                setLoading(false);
            }
        };

        fetchOrder();
        return () => {
            isMounted = false;
        };
    }, [id, user, authLoading]);

    useEffect(() => {
        if (!id) return;

        const supabase = createClient();

        // Listen for delivery status changes
        const deliveryChannel = supabase
            .channel(`delivery-status:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `order_id=eq.${id}`,
                },
                (payload) => {
                    const nextStatus = (payload.new as { status?: DeliveryStatus }).status;
                    if (nextStatus) {
                        setDeliveryStatus(nextStatus);
                    }
                }
            )
            .subscribe();

        // Listen for order status changes (e.g. pin_verified, completed set by edge functions)
        const orderChannel = supabase
            .channel(`order-status:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    setOrder((prev) => prev ? { ...prev, ...(payload.new as Partial<OrderPageData>) } : prev);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(deliveryChannel);
            supabase.removeChannel(orderChannel);
        };
    }, [id]);

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Order...</p>
                </div>
            </div>
        );
    }

    if (!order || (user?.id !== order.buyer_id && user?.id !== order.seller_id)) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Order Not Found</h1>
                <p className="text-gray-500 mb-6 font-medium">This order does not exist or you do not have permission to view it.</p>
                <Link href="/dashboard" className="px-6 py-3 bg-black text-white font-bold text-sm tracking-wide">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const isBuyer = user?.id === order.buyer_id;
    const surfaceStatus = getOrderSurfaceStatus(order.status, deliveryStatus);
    const isCompleted = isCompletedOrderStatus(order.status) || deliveryStatus === 'delivered' || deliveryStatus === 'completed';
    const isCancelled = isCancelledOrderStatus(order.status);
    const isClosed = isTerminalOrderStatus(order.status) || deliveryStatus === 'completed' || deliveryStatus === 'delivered';
    const winnerNoteRaw = order.auction?.auction_winner_notes;
    const winnerNote = Array.isArray(winnerNoteRaw) ? winnerNoteRaw[0]?.note : winnerNoteRaw?.note;
    const statusLabel = formatOrderStatusLabel(surfaceStatus);
    const statusColor = isCancelled
        ? 'bg-gray-100 text-gray-600'
        : isCompleted
        ? 'bg-emerald-100 text-emerald-700'
        : deliveryStatus === 'sent'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-amber-100 text-amber-700';
    const sellerDisplayName = order.seller?.full_name?.trim()
        || order.seller?.username?.trim()
        || `Seller ${order.seller_id.slice(0, 6).toUpperCase()}`;
    const sellerLabel = getUserDisplayLabel({
        fullName: order.seller?.full_name,
        username: order.seller?.username,
        fallbackId: order.seller?.id || order.seller_id,
    });
    const buyerDisplayName = order.buyer?.full_name?.trim()
        || order.buyer?.username?.trim()
        || `Buyer ${order.buyer_id.slice(0, 6).toUpperCase()}`;
    const buyerLabel = getUserDisplayLabel({
        fullName: order.buyer?.full_name,
        username: order.buyer?.username,
        fallbackId: order.buyer?.id || order.buyer_id,
        genericLabel: 'Buyer',
    });

    return (
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            <a
                href={`/api/orders/${order.id}/receipt`}
                download
                className="absolute top-0 right-4 sm:right-6 lg:right-8 inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-black hover:text-black transition-colors shadow-sm"
            >
                <Download className="w-3 h-3" />
                Download Order
            </a>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-gray-200 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                            Order #{order.id.split('-')[0].toUpperCase()}
                        </h1>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <ShareButton
                        title={`Order ${order.id.split('-')[0].toUpperCase()}`}
                        url={`/orders/${order.id}`}
                    />
                    {isClosed && (
                        <div className={`flex items-center gap-2 px-4 py-2 border ${isCancelled ? 'text-gray-600 bg-gray-50 border-gray-200' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-widest">{isCancelled ? 'Order Closed' : 'Transaction Complete'}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Item</h3>
                        <div className="flex gap-4">
                            <div className="w-20 h-20 bg-gray-100 shrink-0 border border-gray-200">
                                {order.auction?.auction_images?.[0] && (
                                    <img src={order.auction.auction_images[0].url} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div>
                                <Link
                                    href={`/auctions/${order.auction_id}`}
                                    className="font-bold text-black hover:underline underline-offset-2 line-clamp-2 leading-snug mb-1 block"
                                >
                                    {order.auction?.title}
                                </Link>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{order.auction?.condition} Condition</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono font-black text-black">{formatCurrency(order.amount)}</p>
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-700">
                                        Pay on Delivery
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{isBuyer ? 'Seller Contact' : 'Buyer'}</h3>
                        {isBuyer ? (
                            <Link
                                href={`/users/${order.seller?.id || order.seller_id}`}
                                className="group block overflow-hidden border border-gray-200 bg-white hover:border-black transition-colors"
                            >
                                <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Seller Profile</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">
                                        Open
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>

                                <div className="p-4">
                                    <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3">
                                        <Avatar
                                            src={order.seller?.avatar_url}
                                            name={sellerDisplayName}
                                            size="md"
                                            className="ring-0 shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-base font-black leading-none text-black">
                                                    {sellerLabel}
                                                </p>
                                                {order.seller?.is_verified && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                            {order.seller?.id && (
                                                <div className="mt-2">
                                                    <SellerRating sellerId={order.seller.id} />
                                                </div>
                                            )}
                                        </div>
                                        <FavoriteSellerButton
                                            sellerId={order.seller?.id || order.seller_id}
                                            sellerName={sellerLabel}
                                            compact
                                            className="shrink-0 self-start"
                                        />
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Phone</p>
                                            <p className="text-sm font-semibold text-black break-all">{order.seller?.phone_number || 'Not provided'}</p>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-2 bg-gray-50 border border-gray-200 text-sm font-semibold text-black">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            {order.seller?.location || 'Not shared'}
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                                        Tap to view this seller&apos;s listings, reviews, and public profile.
                                    </p>
                                </div>
                            </Link>
                        ) : (
                            <Link
                                href={`/users/${order.buyer?.id || order.buyer_id}`}
                                className="group block overflow-hidden border border-gray-200 bg-white hover:border-black transition-colors"
                            >
                                <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Buyer Profile</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">
                                        Open
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>

                                <div className="p-4">
                                    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
                                        <Avatar
                                            src={order.buyer?.avatar_url}
                                            name={buyerDisplayName}
                                            size="md"
                                            className="ring-0 shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-base font-black leading-none text-black">
                                                    {buyerLabel}
                                                </p>
                                                {order.buyer?.is_verified && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Phone</p>
                                            <p className="text-sm font-semibold text-black break-all">{order.buyer?.phone_number || 'Not provided'}</p>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-2 bg-gray-50 border border-gray-200 text-sm font-semibold text-black">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            {order.buyer?.location || 'Not shared'}
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                                        Tap to view this buyer&apos;s public profile and reviews.
                                    </p>
                                </div>
                            </Link>
                        )}
                    </div>

                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Fulfillment</h3>
                        <div className="flex items-start gap-3">
                            {order.fulfillment_type === 'meet_and_inspect' ? (
                                <Package className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                            ) : (
                                <Truck className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className="font-bold text-black mb-1">
                                    {order.fulfillment_type === 'meet_and_inspect' ? 'Pickup / Meet & Inspect' : 'Courier Delivery'}
                                </p>
                                <p className="text-sm text-gray-500 leading-relaxed">{order.meetup_location || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {isBuyer && winnerNote && (
                        <div className="border border-emerald-200 p-6 bg-emerald-50">
                            <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3">Seller Note (Winner Only)</h3>
                            <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">{winnerNote}</p>
                        </div>
                    )}

                    {!isCancelled && <DeliveryTimeline status={deliveryStatus} />}
                </div>

                <div className="space-y-6">
                    <OrderCancellationPanel
                        orderId={order.id}
                        status={order.status}
                        isBuyer={isBuyer}
                        canCancel={!isClosed && (deliveryStatus === 'pending' || order.status === 'pending_meetup' || order.status === 'pending_payment')}
                        cancellationReason={order.cancellation_reason}
                    />

                    {isBuyer ? (
                        <DeliveryCodeDisplay
                            orderId={order.id}
                            deliveryStatus={deliveryStatus}
                            onStatusChange={() => setDeliveryStatus('completed')}
                        />
                    ) : (
                        <DeliveryConfirmationForm orderId={order.id} deliveryStatus={deliveryStatus} onStatusChange={setDeliveryStatus} />
                    )}

                    <div id="chat">
                        <OrderChat
                            orderId={order.id}
                            userId={user!.id}
                            isCompleted={isClosed}
                            otherPartyName={
                                isBuyer
                                    ? ((order.seller?.full_name ?? 'Seller').split(' ')[0])
                                    : ((order.buyer?.full_name ?? 'Buyer').split(' ')[0])
                            }
                        />
                    </div>

                    {isCompleted && !hasReviewed && (
                        <ReviewForm
                            orderId={order.id}
                            revieweeId={isBuyer ? order.seller_id : order.buyer_id}
                            revieweeName={
                                isBuyer
                                    ? (order.seller?.full_name ?? 'Seller').split(' ')[0]
                                    : (order.buyer?.full_name ?? 'Buyer').split(' ')[0]
                            }
                            onSubmitted={() => setHasReviewed(true)}
                        />
                    )}
                </div>
            </div>

            {sellerListings.length > 0 && (
                <div className="mt-10 pt-8 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-black uppercase tracking-widest text-black">
                            More from {(order.seller?.full_name ?? 'Seller').split(' ')[0]}
                        </h2>
                        <Link href={`/users/${order.seller_id}`} className="text-xs font-bold text-gray-500 hover:text-black underline underline-offset-2">
                            View all
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sellerListings.map((listing) => (
                            <Link
                                key={listing.id}
                                href={`/auctions/${listing.id}`}
                                className="group block border border-gray-200 bg-white hover:border-black transition-colors overflow-hidden"
                            >
                                <div className="aspect-square bg-gray-100 overflow-hidden">
                                    {listing.auction_images?.[0] ? (
                                        <img
                                            src={listing.auction_images[0].url}
                                            alt={listing.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-8 h-8 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-xs font-bold text-black line-clamp-2 leading-snug mb-1">{listing.title}</p>
                                    {listing.condition && (
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{listing.condition}</p>
                                    )}
                                    <p className="font-mono font-black text-sm text-black">{formatCurrency(listing.current_price)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

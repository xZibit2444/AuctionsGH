'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { ShieldCheck, User, Package, Truck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import DeliveryCodeDisplay from '@/components/delivery/DeliveryCodeDisplay';
import DeliveryConfirmationForm from '@/components/delivery/DeliveryConfirmationForm';
import OrderChat from '@/components/order/OrderChat';
import ReviewForm from '@/components/order/ReviewForm';
import type { DeliveryStatus } from '@/types/delivery';

interface OrderPageProps {
    params: Promise<{ id: string }>;
}

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
    const [order, setOrder] = useState<any>(null);
    const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending');
    const [loading, setLoading] = useState(true);
    const [hasReviewed, setHasReviewed] = useState(false);

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
                    buyer:profiles!orders_buyer_id_fkey ( id, full_name, phone_number ),
                    seller:profiles!orders_seller_id_fkey ( id, full_name, phone_number, location ),
                    deliveries!deliveries_order_id_fkey ( id, status, delivered_at )
                `)
                .eq('id', id)
                .single();

            if (!isMounted) return;

            if (!error && data) {
                setOrder(data);
                const dels = Array.isArray((data as any).deliveries)
                    ? (data as any).deliveries
                    : (data as any).deliveries
                        ? [(data as any).deliveries]
                        : [];

                if (dels[0]) {
                    setDeliveryStatus(dels[0].status as DeliveryStatus);
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
        const channel = supabase
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

        return () => {
            supabase.removeChannel(channel);
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
    const isCompleted = order.status === 'completed' || order.status === 'pin_verified' || deliveryStatus === 'delivered' || deliveryStatus === 'completed';
    const winnerNoteRaw = order.auction?.auction_winner_notes;
    const winnerNote = Array.isArray(winnerNoteRaw) ? winnerNoteRaw[0]?.note : winnerNoteRaw?.note;
    const statusLabel = isCompleted ? 'Completed' : deliveryStatus.replace('_', ' ');
    const statusColor = isCompleted
        ? 'bg-emerald-100 text-emerald-700'
        : deliveryStatus === 'sent'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-amber-100 text-amber-700';

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
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
                {isCompleted && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Transaction Complete</span>
                    </div>
                )}
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
                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                            <div className="space-y-1.5">
                                <p className="font-bold text-black">
                                    {isBuyer ? order.seller?.full_name : order.buyer?.full_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    <span className="font-semibold text-black">Phone: </span>
                                    {(isBuyer ? order.seller?.phone_number : order.buyer?.phone_number) || 'Not provided'}
                                </p>
                                {isBuyer && order.seller?.location && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-semibold text-black">Location: </span>
                                        {order.seller.location}
                                    </p>
                                )}
                                {isBuyer && (
                                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                                        Contact the seller to arrange delivery or pickup.
                                    </p>
                                )}
                            </div>
                        </div>
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

                    <DeliveryTimeline status={deliveryStatus} />
                </div>

                <div className="space-y-6">
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
                            isCompleted={isCompleted}
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
        </div>
    );
}

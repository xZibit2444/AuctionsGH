'use client';

import { use, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { ShieldCheck, User, Package, Handshake, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { verifyOrderPinAction } from '@/app/actions/verifyPin';
import Link from 'next/link';

interface OrderPageProps {
    params: Promise<{ id: string }>;
}

export default function OrderPage({ params }: OrderPageProps) {
    const { id } = use(params);
    const { user } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pin, setPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!user) return;
            const supabase = createClient();

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    auction:auctions ( id, title, current_price, condition, auction_images(url) ),
                    buyer:profiles!orders_buyer_id_fkey ( id, full_name, email, phone_number ),
                    seller:profiles!orders_seller_id_fkey ( id, full_name, email, phone_number )
                `)
                .eq('id', id)
                .single();

            if (!error && data) {
                setOrder(data);
            }
            setLoading(false);
        };

        fetchOrder();
    }, [id, user, verifySuccess]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
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
    const isSeller = user?.id === order.seller_id;
    const isMeetup = order.fulfillment_type === 'meet_and_inspect';
    const isVerified = order.status === 'pin_verified' || order.status === 'completed';

    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifyError('');
        setIsVerifying(true);

        const result = await verifyOrderPinAction(order.id, pin);
        if (result.success) {
            setVerifySuccess(true);
            setPin('');
        } else {
            setVerifyError(result.error || 'Failed to verify PIN');
        }
        setIsVerifying(false);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-gray-200 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">Order #{order.id.split('-')[0].toUpperCase()}</h1>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isVerified ? 'Completed' : order.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                {isVerified && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Transaction Secured</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column - Details */}
                <div className="space-y-8">

                    {/* Item Summary */}
                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Item Snapshot</h3>
                        <div className="flex gap-4">
                            <div className="w-20 h-20 bg-gray-100 shrink-0 border border-gray-200">
                                {order.auction?.auction_images?.[0] && (
                                    <img src={order.auction.auction_images[0].url} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div>
                                <Link href={`/auctions/${order.auction_id}`} className="font-bold text-black hover:underline line-clamp-2 leading-snug mb-1">
                                    {order.auction?.title}
                                </Link>
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">{order.auction?.condition} Condition</p>
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${order.payment_method === 'escrow' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {order.payment_method === 'escrow' ? 'Escrow Protected' : 'Pay on Delivery'}
                                    </span>
                                </div>
                                <p className="font-mono font-black text-black">{formatCurrency(order.amount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Counterparty Contact */}
                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                            {isBuyer ? 'Seller Details' : 'Buyer Details'}
                        </h3>
                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-black mb-1">
                                    {isBuyer ? order.seller?.full_name : order.buyer?.full_name}
                                </p>
                                <p className="text-sm text-gray-500 mb-1">Phone: {isBuyer ? order.seller?.phone_number : order.buyer?.phone_number || 'Not provided'}</p>
                                <p className="text-sm text-gray-500">Email: {isBuyer ? order.seller?.email : order.buyer?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Instructions */}
                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Fulfillment Details</h3>
                        <div className="flex items-start gap-3">
                            {isMeetup ? <Handshake className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" /> : <Package className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />}
                            <div>
                                <p className="font-bold text-black mb-1">
                                    {isMeetup ? 'Meet & Inspect Handover' : 'Escrow Delivery'}
                                </p>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {isMeetup
                                        ? `Arranging a meetup at: ${order.meetup_location}`
                                        : `Delivery addressed to: ${order.meetup_location}`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column - Action Core */}
                <div>
                    {!isVerified && (
                        <div className="bg-black text-white p-6 sm:p-8 sticky top-24">
                            {isBuyer ? (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                        <h2 className="text-xl font-black tracking-tight">Your Action Required</h2>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed mb-6">
                                        {order.payment_method === 'escrow'
                                            ? "Your payment is securely locked in escrow. Once you meet the seller and insect the item, you must hand them your secret 4-digit PIN to release the funds."
                                            : "This is a Pay on Delivery order. Once you meet the seller and inspect the item, you must pay them the full amount directly (Cash/Momo) and then provide your secret 4-digit PIN to confirm receipt."}
                                    </p>

                                    <div className="bg-white/10 p-4 border border-white/20 mb-6">
                                        <div className="flex gap-3 mb-2">
                                            <Info className="w-5 h-5 text-emerald-400 shrink-0" />
                                            <h3 className="text-sm font-bold">Where is my PIN?</h3>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed pl-8">
                                            Your secure PIN was generated instantly upon checkout and sent directly to your Dashboard Notifications. Do not share it until you are fully satisfied with the item.
                                        </p>
                                    </div>

                                    <Link href="/dashboard" className="block w-full text-center py-4 bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors">
                                        Check Notifications for PIN
                                    </Link>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <ShieldCheck className={`w-6 h-6 ${order.payment_method === 'escrow' ? 'text-emerald-400' : 'text-orange-400'}`} />
                                        <h2 className="text-xl font-black tracking-tight">Verify Handover</h2>
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed mb-6">
                                        {order.payment_method === 'escrow'
                                            ? "The buyer's funds are secured in escrow. When you hand over the item, ask the buyer for their 4-digit secret PIN. Enter it below to instantly complete the order and release funds to your account."
                                            : "The buyer has chosen to Pay on Delivery. Collect the full amount from the buyer first, then ask them for their secret 4-digit PIN. Enter it below to officially complete the sale."}
                                    </p>

                                    {verifyError && (
                                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-sm font-bold">
                                            {verifyError}
                                        </div>
                                    )}

                                    <form onSubmit={handleVerifyPin} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">Secret Delivery PIN</label>
                                            <input
                                                type="text"
                                                maxLength={4}
                                                required
                                                placeholder="****"
                                                value={pin}
                                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // numbers only
                                                className="w-full bg-white/5 border border-white/20 p-4 text-2xl tracking-[1em] text-center text-white focus:outline-none focus:border-white font-mono"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isVerifying || pin.length !== 4}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-white text-black hover:bg-gray-200 disabled:opacity-50 text-sm font-bold uppercase tracking-widest transition-colors"
                                        >
                                            {isVerifying ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                                            ) : (
                                                'Verify & Complete Order'
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {isVerified && (
                        <div className="bg-emerald-50 border border-emerald-200 p-8 text-center sticky top-24">
                            <TrophyIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-black tracking-tight mb-2">Transaction Complete</h2>
                            <p className="text-emerald-700 font-medium">
                                {isBuyer
                                    ? (order.payment_method === 'escrow'
                                        ? "You've successfully secured the item and the escrow funds have been released to the seller. Enjoy your new device!"
                                        : "Transaction confirmed! You've successfully received the item. Enjoy your new device!")
                                    : (order.payment_method === 'escrow'
                                        ? "The PIN was verified successfully! Escrow funds have been released to your account."
                                        : "The PIN was verified successfully! The sale is now officially completed in our records.")}
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

function TrophyIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}

'use client';

import { use, useEffect, useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import CheckoutTimer from '@/components/checkout/CheckoutTimer';
import { ShieldCheck, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createOrderAction } from '@/app/actions/createOrder';

interface CheckoutPageProps {
    params: Promise<{ id: string }>;
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
    const { id } = use(params);
    const { auction, loading, error } = useAuction(id);
    const { user } = useAuth();
    const router = useRouter();
    const [faqOpen, setFaqOpen] = useState<number | null>(0); // First FAQ open by default
    const [isProcessing, setIsProcessing] = useState(false);
    const [headerError, setHeaderError] = useState('');

    const [form, setForm] = useState({
        name: '',
        phone: '',
        delivery: 'pickup',
        address: '',
    });

    const orderRaw = (auction as any)?.orders;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;

    // Always declare hooks before any early returns to keep hook order stable.
    useEffect(() => {
        if (order?.id) {
            router.replace(`/orders/${order.id}`);
        }
    }, [order?.id, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Unable to Load Checkout</h1>
                <p className="text-gray-500 mb-6 font-medium">
                    {error || 'We could not load this auction right now. Please refresh and try again.'}
                </p>
                <Link href="/dashboard" className="px-6 py-3 bg-black text-white font-bold text-sm tracking-wide">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    // Protection: Only the winner can access this page
    if (!user || user.id !== auction.winner_id || auction.status !== 'sold') {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Access Denied</h1>
                <p className="text-gray-500 mb-6 font-medium">You do not have permission to checkout for this auction.</p>
                <Link href="/dashboard" className="px-6 py-3 bg-black text-white font-bold text-sm tracking-wide">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const subtotal = auction.current_price;
    const isDelivery = form.delivery === 'delivery';
    const total = subtotal;

    if (order) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Order Already Created</h1>
                <p className="text-gray-500 mb-6 font-medium">
                    This checkout has already been completed. Redirecting you to the order now.
                </p>
                <Link href={`/orders/${order.id}`} className="px-6 py-3 bg-black text-white font-bold text-sm tracking-wide">
                    Open Order
                </Link>
            </div>
        );
    }

    const endsAt = auction.ends_at ? new Date(auction.ends_at).getTime() : 0;
    const isExpired = endsAt > 0 && (Date.now() - endsAt > 30 * 60 * 1000);

    if (isExpired) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-8 h-8 opacity-50" />
                </div>
                <h1 className="text-2xl font-black text-black tracking-tight mb-2">Checkout Window Closed</h1>
                <p className="text-gray-500 mb-8 font-medium italic">
                    The 30-minute window to confirm this order has passed. This winning bid has been marked as VOID.
                </p>
                <Link href="/dashboard" className="inline-block px-8 py-4 bg-black text-white font-bold text-sm uppercase tracking-widest hover:bg-gray-900 transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const faqs = [
        {
            q: "How does Pay on Delivery work?",
            a: "You confirm the order now, then pay the seller when the item is delivered or at meetup. Always inspect the item before handing over payment."
        },
        {
            q: "What if I miss the 30-minute window?",
            a: "If the order is not confirmed within 30 minutes, your winning bid is cancelled and may be passed to the next highest bidder. Repeated unconfirmed wins may result in account suspension."
        },
        {
            q: "How do I receive my item?",
            a: "You can choose to meet the seller in a public place (Pickup) or have it delivered via our trusted courier partners if you are in Accra or Kumasi."
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setHeaderError('');
        setIsProcessing(true);
        try {
            const result = await createOrderAction({
                auctionId: auction.id,
                buyerId: user.id,
                deliveryMethod: form.delivery as 'pickup' | 'delivery',
                amount: total,
                address: form.address,
                phone: form.phone,
                name: form.name
            });

            if (result.success && result.orderId) {
                router.push(`/orders/${result.orderId}`);
                return;
            }

            setHeaderError(result.error || 'Failed to process payment');
        } catch {
            setHeaderError('Checkout failed unexpectedly. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <h2 className="text-2xl font-black text-black tracking-tight mb-2">
                    Confirming Order...
                </h2>
                <p className="text-gray-500 font-medium">
                    Please wait while we set up your order details.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" />
                    Secure Connection
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            {/* Header */}
            {headerError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 font-bold text-sm">
                    {headerError}
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-black tracking-tight mb-2">Confirm Your Order</h1>
                    <p className="text-gray-500 text-sm font-medium">Pay on Delivery only. Confirm now to secure the item.</p>
                </div>
                <div className="w-full md:w-64 shrink-0">
                    <CheckoutTimer endsAt={auction.ends_at} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Left Column (Left 7 cols) */}
                <div className="lg:col-span-7 space-y-10">

                    {/* FAQ SECTION */}
                    <div className="bg-gray-50 border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 text-black">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <h2 className="text-lg font-bold tracking-tight">Buyer Protection FAQ</h2>
                        </div>

                        <div className="space-y-3">
                            {faqs.map((faq, idx) => (
                                <div key={idx} className="bg-white border border-gray-200">
                                    <button
                                        onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                                        className="w-full flex items-center justify-between p-4 text-left"
                                    >
                                        <span className="font-bold text-sm text-black">{faq.q}</span>
                                        {faqOpen === idx ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                    {faqOpen === idx && (
                                        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DETAILS FORM SECTION */}
                    <div>
                        <h3 className="text-xs font-black text-black uppercase tracking-widest mb-4">Your Details</h3>
                        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-white border border-gray-300 p-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                        placeholder="John Doe"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full bg-white border border-gray-300 p-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                        placeholder="024 123 4567"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery Method</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`cursor-pointer border p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors ${form.delivery === 'pickup' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            value="pickup"
                                            className="sr-only"
                                            checked={form.delivery === 'pickup'}
                                            onChange={(e) => setForm({ ...form, delivery: e.target.value })}
                                        />
                                        <div className={`w-3 h-3 rounded-full mb-1 ${form.delivery === 'pickup' ? 'bg-black' : 'bg-gray-200'}`} />
                                        <span className={`text-sm font-bold ${form.delivery === 'pickup' ? 'text-black' : 'text-gray-500'}`}>Meet & Inspect</span>
                                        <span className="text-xs text-gray-400">Free</span>
                                    </label>

                                    <label className={`cursor-pointer border p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors ${form.delivery === 'delivery' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            value="delivery"
                                            className="sr-only"
                                            checked={form.delivery === 'delivery'}
                                            onChange={(e) => setForm({ ...form, delivery: e.target.value })}
                                        />
                                        <div className={`w-3 h-3 rounded-full mb-1 ${form.delivery === 'delivery' ? 'bg-black' : 'bg-gray-200'}`} />
                                        <div className="flex items-center gap-1.5 justify-center">
                                            <Truck className={`w-4 h-4 ${form.delivery === 'delivery' ? 'text-black' : 'text-gray-400'}`} />
                                            <span className={`text-sm font-bold ${form.delivery === 'delivery' ? 'text-black' : 'text-gray-500'}`}>Delivery</span>
                                        </div>
                                        <span className="text-xs text-gray-400">+ 50 GHC</span>
                                    </label>
                                </div>
                            </div>

                            {form.delivery === 'delivery' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery Address</label>
                                    <textarea
                                        required
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="w-full bg-white border border-gray-300 p-3 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black min-h-[100px]"
                                        placeholder="Enter your full street address and digital address..."
                                    />
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Right Column - Order Summary (Right 5 cols) */}
                <div className="lg:col-span-5">
                    <div className="bg-white border border-gray-200 sticky top-24">
                        <div className="p-6">
                            <h3 className="text-xs font-black text-black uppercase tracking-widest mb-6">Order Summary</h3>

                            {/* Item */}
                            <div className="flex gap-4 pb-6 border-b border-gray-100 mb-6">
                                <div className="w-16 h-16 bg-gray-100 shrink-0 border border-gray-200">
                                    {auction.auction_images && auction.auction_images.length > 0 && (
                                        <img src={auction.auction_images[0].url} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-black line-clamp-2 leading-snug">{auction.title}</p>
                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{auction.condition} Condition</p>
                                </div>
                            </div>

                            <div className="mb-6 border border-gray-200 p-3 bg-gray-50">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Payment Method</h4>
                                <p className="text-sm font-semibold text-black">Pay on Delivery</p>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="space-y-4 mb-6 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span className="font-medium">Winning Bid</span>
                                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                                </div>
                                {isDelivery && (
                                    <div className="flex justify-between text-gray-600">
                                        <span className="font-medium">Delivery Fee</span>
                                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Agreed with seller</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end pt-5 border-t border-gray-200 mb-8">
                                <span className="text-sm font-bold text-black uppercase tracking-widest">Total on Delivery</span>
                                <span className="text-2xl font-black text-black tracking-tight">{formatCurrency(total)}</span>
                            </div>

                            {/* Submit */}
                            <button
                                form="checkout-form"
                                type="submit"
                                disabled={isProcessing}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black text-white text-sm font-bold hover:bg-gray-900 focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-all uppercase tracking-widest mb-4"
                            >
                                {isProcessing ? 'Confirming...' : 'Confirm Pay-on-Delivery Order'}
                            </button>

                            <div className="text-center text-[11px] text-gray-400 font-medium">
                                You will pay the seller directly upon delivery or at meetup after inspection.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

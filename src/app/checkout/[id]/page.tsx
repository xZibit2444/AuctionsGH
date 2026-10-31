'use client';

import { use, useEffect, useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { getListingType } from '@/lib/listings';
import { isTerminalOrderStatus } from '@/lib/orderStatus';
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

    const orderRaw = (auction as unknown as { orders?: { id: string; status: string; buyer_id?: string }[] })?.orders;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
    const isOwnOrder = !!order && !!user && order.buyer_id === user.id;

    // Always declare hooks before any early returns to keep hook order stable.
    useEffect(() => {
        if (isOwnOrder && order?.id) {
            router.replace(`/orders/${order.id}`);
        }
    }, [isOwnOrder, order?.id, router]);

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
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    // A buyer whose offer was accepted on a permanent listing confirms their
    // order while the listing is still live (it only comes down when an order
    // is completed), so they check out without being the recorded winner yet.
    const offersRaw = (auction as unknown as { auction_offers?: { id: string; buyer_id: string; amount: number; counter_amount: number | null; status: string }[] })?.auction_offers;
    const offers = Array.isArray(offersRaw) ? offersRaw : [];
    const myAcceptedOffer = offers.find((o) => o.buyer_id === user?.id && o.status === 'accepted');
    const isPermanentActive = getListingType(auction) === 'permanent' && auction.status === 'active';
    const isOfferBuyer = isPermanentActive && !!myAcceptedOffer;

    // Protection: only the winner (timed auctions, Buy-now) or the accepted-offer
    // buyer (permanent listings) can access this page
    if (!user || (!isOfferBuyer && (user.id !== auction.winner_id || auction.status !== 'sold'))) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Access Denied</h1>
                <p className="text-gray-500 mb-6 font-medium">You do not have permission to checkout for this auction.</p>
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    // Accepted-offer buyers pay the agreed offer amount, not the listed price
    // Agreed price: the counter amount when the buyer accepted a counter-offer.
    const subtotal = isOfferBuyer ? Number(myAcceptedOffer.counter_amount ?? myAcceptedOffer.amount) : auction.current_price;
    const isDelivery = form.delivery === 'delivery';
    const total = subtotal;

    if (order && !isOwnOrder && !isTerminalOrderStatus(order.status)) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">A Deal Is Already Open</h1>
                <p className="text-gray-500 mb-6 font-medium">
                    A deal for this item is already open with another buyer. The listing stays available until an order is completed, so if that deal falls through you can confirm then.
                </p>
                <Link href={`/auctions/${auction.id}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Back to Listing
                </Link>
            </div>
        );
    }

    if (isOwnOrder) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Order Already Created</h1>
                <p className="text-gray-500 mb-6 font-medium">
                    This checkout has already been completed. Redirecting you to the order now.
                </p>
                <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Open Order
                </Link>
            </div>
        );
    }

    const endsAt = auction.ends_at ? new Date(auction.ends_at).getTime() : 0;
    const isFixedPrice = getListingType(auction) === 'permanent';
    const isExpired = !isFixedPrice && endsAt > 0 && (Date.now() - endsAt > 30 * 60 * 1000);

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
                <Link href="/dashboard" className="inline-block px-8 py-4 rounded-xl bg-amber-400 text-black font-extrabold text-sm uppercase tracking-widest hover:bg-amber-500 transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const faqs = [
        {
            q: "How does payment work?",
            a: "AuctionsGH does not take payment. You confirm the order now, then you and the seller agree how and where to pay and collect. Always inspect the item before handing over payment."
        },
        ...(isFixedPrice ? [] : [{
            q: "What if I miss the 30-minute window?",
            a: "If the order is not confirmed within 30 minutes, your order is cancelled and the item may go back on sale. Repeated unconfirmed wins may result in account suspension."
        }]),
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
                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
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
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 font-bold text-sm">
                    {headerError}
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-black tracking-tight mb-2">Confirm Your Order</h1>
                    <p className="text-gray-500 text-sm font-medium">No online payment. Confirm now to secure the item, then arrange payment and collection with the seller.</p>
                </div>
                {!isFixedPrice && (
                    <div className="w-full md:w-64 shrink-0">
                        <CheckoutTimer endsAt={auction.ends_at} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Left Column (Left 7 cols) */}
                <div className="lg:col-span-7 space-y-10">

                    {/* FAQ SECTION */}
                    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 text-black">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <h2 className="text-lg font-bold tracking-tight">Buyer Protection FAQ</h2>
                        </div>

                        <div className="space-y-3">
                            {faqs.map((faq, idx) => (
                                <div key={idx} className="rounded-xl bg-white border border-gray-200">
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
                                    <label className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors ${form.delivery === 'pickup' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            value="pickup"
                                            className="sr-only"
                                            checked={form.delivery === 'pickup'}
                                            onChange={(e) => setForm({ ...form, delivery: e.target.value })}
                                        />
                                        <div className={`w-3 h-3 rounded-full mb-1 ${form.delivery === 'pickup' ? 'bg-amber-400' : 'bg-gray-200'}`} />
                                        <span className={`text-sm font-bold ${form.delivery === 'pickup' ? 'text-black' : 'text-gray-500'}`}>Meet & Inspect</span>
                                        <span className="text-xs text-gray-400">Free</span>
                                    </label>

                                    <label className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors ${form.delivery === 'delivery' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            value="delivery"
                                            className="sr-only"
                                            checked={form.delivery === 'delivery'}
                                            onChange={(e) => setForm({ ...form, delivery: e.target.value })}
                                        />
                                        <div className={`w-3 h-3 rounded-full mb-1 ${form.delivery === 'delivery' ? 'bg-amber-400' : 'bg-gray-200'}`} />
                                        <div className="flex items-center gap-1.5 justify-center">
                                            <Truck className={`w-4 h-4 ${form.delivery === 'delivery' ? 'text-black' : 'text-gray-400'}`} />
                                            <span className={`text-sm font-bold ${form.delivery === 'delivery' ? 'text-black' : 'text-gray-500'}`}>Delivery</span>
                                        </div>
                                        <span className="text-xs text-gray-400">Fee agreed with seller</span>
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
                    <div className="rounded-2xl bg-white border border-gray-200 sticky top-24">
                        <div className="p-6">
                            <h3 className="text-xs font-black text-black uppercase tracking-widest mb-6">Order Summary</h3>

                            {/* Item */}
                            <div className="flex gap-4 pb-6 border-b border-gray-100 mb-6">
                                <div className="w-16 h-16 bg-gray-100 shrink-0 rounded-xl overflow-hidden">
                                    {auction.auction_images && auction.auction_images.length > 0 && (
                                        <img src={auction.auction_images[0].url} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-black line-clamp-2 leading-snug">{auction.title}</p>
                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{auction.condition} Condition</p>
                                </div>
                            </div>

                            <div className="mb-6 rounded-xl border border-gray-200 p-3 bg-gray-50">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Payment Method</h4>
                                <p className="text-sm font-semibold text-black">Paid directly to the seller</p>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="space-y-4 mb-6 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span className="font-medium">{isFixedPrice ? 'Price' : 'Winning Bid'}</span>
                                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                                </div>
                                {isDelivery && (
                                    <div className="flex justify-between text-gray-600">
                                        <span className="font-medium">Delivery Fee</span>
                                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Agreed with seller</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end pt-5 border-t border-gray-200 mb-8">
                                <span className="text-sm font-bold text-black uppercase tracking-widest">Item Total</span>
                                <span className="text-2xl font-black text-black tracking-tight">{formatCurrency(total)}</span>
                            </div>

                            {/* Submit */}
                            <button
                                form="checkout-form"
                                type="submit"
                                disabled={isProcessing}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-400 text-black text-sm font-black hover:bg-amber-500 focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 disabled:opacity-50 transition-all uppercase tracking-widest mb-4"
                            >
                                {isProcessing ? 'Confirming...' : 'Confirm Order'}
                            </button>

                            <div className="text-center text-[11px] text-gray-400 font-medium">
                                You pay the seller directly, as you both agree. Inspect the item first.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

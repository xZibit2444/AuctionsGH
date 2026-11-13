'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, getUserDisplayLabel } from '@/lib/utils';
import { ShieldCheck, Package, MessageCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import OfferChatThread from '@/components/offer/OfferChatThread';

interface OfferDealPageProps {
    params: Promise<{ id: string }>;
}

type PartyProfile = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
};

type OfferDeal = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    counter_amount: number | null;
    status: 'pending' | 'accepted' | 'declined' | 'countered';
    created_at: string;
    auction: {
        id: string;
        title: string;
        condition: string | null;
        auction_images: { url: string }[] | null;
    } | null;
    buyer: PartyProfile | null;
    seller: PartyProfile | null;
};

/**
 * Deal room for one accepted offer: chat with the other party in one place.
 * Payment and handover are arranged directly between buyer and seller here;
 * AuctionsGH does not create an order or collect payment.
 */
export default function OfferDealPage({ params }: OfferDealPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [offer, setOffer] = useState<OfferDeal | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirectTo=/offers/${id}`);
            return;
        }

        let cancelled = false;
        const supabase = createClient();

        const load = async () => {
            // Database types do not include auction_offers yet.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('auction_offers') as any)
                .select(`
                    id, auction_id, buyer_id, seller_id, amount, counter_amount, status, created_at,
                    auction:auctions ( id, title, condition, auction_images(url) ),
                    buyer:profiles!buyer_id ( id, full_name, username, avatar_url, is_verified ),
                    seller:profiles!seller_id ( id, full_name, username, avatar_url, is_verified )
                `)
                .eq('id', id)
                .maybeSingle();

            if (cancelled) return;
            if (error || !data) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            const deal = data as OfferDeal;
            setOffer(deal);
            setLoading(false);
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [id, user, authLoading, router]);

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading…</p>
                </div>
            </div>
        );
    }

    if (notFound || !offer || (user?.id !== offer.buyer_id && user?.id !== offer.seller_id)) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Deal Not Found</h1>
                <p className="text-gray-500 mb-6 font-medium">This deal does not exist or you do not have permission to view it.</p>
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const isBuyer = user?.id === offer.buyer_id;
    const other = isBuyer ? offer.seller : offer.buyer;
    const otherLabel = getUserDisplayLabel({
        fullName: other?.full_name,
        username: other?.username,
        fallbackId: other?.id ?? (isBuyer ? offer.seller_id : offer.buyer_id),
        genericLabel: isBuyer ? 'Seller' : 'Buyer',
    });
    const otherFirstName = (other?.full_name ?? (isBuyer ? 'Seller' : 'Buyer')).split(' ')[0];
    const agreedPrice = Number(offer.counter_amount ?? offer.amount);

    if (offer.status !== 'accepted') {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Offer Not Accepted Yet</h1>
                <p className="text-gray-500 mb-6 font-medium">
                    The deal chat opens once this offer is accepted.
                </p>
                <Link href={`/auctions/${offer.auction_id}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Back to Listing
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
            <Link
                href={`/auctions/${offer.auction_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors mb-6"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Listing
            </Link>

            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">Deal &amp; Chat</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
                    Offer Accepted
                </span>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-8">
                Offer accepted on {new Date(offer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Item</h3>
                    <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0 overflow-hidden">
                            {offer.auction?.auction_images?.[0] ? (
                                <img src={offer.auction.auction_images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-300" />
                                </div>
                            )}
                        </div>
                        <div>
                            <Link
                                href={`/auctions/${offer.auction_id}`}
                                className="font-bold text-black hover:underline underline-offset-2 line-clamp-2 leading-snug mb-1 block"
                            >
                                {offer.auction?.title}
                            </Link>
                            {offer.auction?.condition && (
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{offer.auction.condition} Condition</p>
                            )}
                            <div className="flex items-center gap-2">
                                <p className="font-mono font-black text-black">{formatCurrency(agreedPrice)}</p>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-700">
                                    Agreed Price
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{isBuyer ? 'Seller' : 'Buyer'}</h3>
                    <div className="flex items-center gap-3">
                        <Avatar src={other?.avatar_url} name={otherLabel} size="md" className="ring-0 shrink-0" />
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <p className="text-base font-black leading-none text-black">{otherLabel}</p>
                            {other?.is_verified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verified
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                        Numbers stay private — chat here to arrange payment and pickup.
                    </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">Next Step: Arrange the Handover</h3>
                    <p className="text-sm text-amber-900 leading-relaxed">
                        Agree payment and pickup with {otherFirstName} in the chat below. Inspect the item before you pay - AuctionsGH does not take payment or deliver items.
                    </p>
                </div>

                <OfferChatThread
                    auctionId={offer.auction_id}
                    buyerId={offer.buyer_id}
                    userId={user!.id}
                    isSeller={!isBuyer}
                    otherPartyName={otherFirstName}
                />
            </div>
        </div>
    );
}

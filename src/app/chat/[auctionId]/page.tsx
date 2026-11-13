'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, getUserDisplayLabel } from '@/lib/utils';
import { ShieldCheck, Package, MessageCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import OfferChatThread from '@/components/offer/OfferChatThread';

interface ListingChatPageProps {
    params: Promise<{ auctionId: string }>;
}

type PartyProfile = {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
};

type Listing = {
    id: string;
    title: string;
    condition: string | null;
    current_price: number | null;
    price_on_request?: boolean | null;
    seller_id: string;
    auction_images: { url: string }[] | null;
    seller: PartyProfile | null;
};

type ThreadSummary = {
    buyer_id: string;
    buyer: PartyProfile | null;
    last_body: string;
    last_at: string;
};

/**
 * In-house chat between a buyer and the seller of one listing, with no offer
 * required. The thread is the same (listing, buyer) thread the Deal & Chat
 * page uses once an offer is accepted, so the conversation carries over.
 * Sellers open a specific buyer thread with ?buyer=<id> or pick from the
 * thread list.
 */
function ListingChatInner({ params }: ListingChatPageProps) {
    const { auctionId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedBuyer = searchParams.get('buyer');
    const { user, loading: authLoading } = useAuth();
    const [listing, setListing] = useState<Listing | null>(null);
    const [threads, setThreads] = useState<ThreadSummary[]>([]);
    const [buyerProfile, setBuyerProfile] = useState<PartyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push(`/login?redirectTo=/chat/${auctionId}`);
            return;
        }

        let cancelled = false;
        const supabase = createClient();

        const load = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('auctions') as any)
                .select(`
                    id, title, condition, current_price, price_on_request, seller_id,
                    auction_images ( url ),
                    seller:profiles!auctions_seller_id_fkey ( id, full_name, username, avatar_url, is_verified )
                `)
                .eq('id', auctionId)
                .maybeSingle();

            if (cancelled) return;
            if (error || !data) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            const row = data as Omit<Listing, 'seller'> & { seller: PartyProfile[] | PartyProfile | null };
            const seller = Array.isArray(row.seller) ? (row.seller[0] ?? null) : row.seller;
            setListing({ ...row, seller });

            const isSellerViewer = row.seller_id === user.id;
            if (isSellerViewer && !requestedBuyer) {
                // Thread picker: one entry per buyer who has messaged this listing.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: msgs } = await (supabase.from('auction_offer_messages') as any)
                    .select('buyer_id, body, created_at')
                    .eq('auction_id', auctionId)
                    .order('created_at', { ascending: false })
                    .limit(500);
                if (cancelled) return;
                const byBuyer = new Map<string, { body: string; at: string }>();
                for (const m of (msgs ?? []) as { buyer_id: string; body: string; created_at: string }[]) {
                    if (!byBuyer.has(m.buyer_id)) byBuyer.set(m.buyer_id, { body: m.body, at: m.created_at });
                }
                const buyerIds = [...byBuyer.keys()];
                let profiles: PartyProfile[] = [];
                if (buyerIds.length > 0) {
                    const { data: profs } = await supabase
                        .from('profiles')
                        .select('id, full_name, username, avatar_url, is_verified')
                        .in('id', buyerIds);
                    profiles = (profs ?? []) as PartyProfile[];
                }
                if (cancelled) return;
                setThreads(buyerIds.map((id) => ({
                    buyer_id: id,
                    buyer: profiles.find((p) => p.id === id) ?? null,
                    last_body: byBuyer.get(id)!.body,
                    last_at: byBuyer.get(id)!.at,
                })));
                setLoading(false);
                return;
            }

            if (isSellerViewer && requestedBuyer) {
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, avatar_url, is_verified')
                    .eq('id', requestedBuyer)
                    .maybeSingle();
                if (cancelled) return;
                setBuyerProfile((prof as PartyProfile | null) ?? null);
            }
            setLoading(false);
        };

        void load();
        return () => { cancelled = true; };
    }, [auctionId, user, authLoading, router, requestedBuyer]);

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

    if (notFound || !listing) {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2 text-black">Listing Not Found</h1>
                <p className="text-gray-500 mb-6 font-medium">This listing does not exist or could not be loaded.</p>
                <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                    Back to Marketplace
                </Link>
            </div>
        );
    }

    const isSeller = user?.id === listing.seller_id;

    // Seller thread picker
    if (isSeller && !requestedBuyer) {
        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
                <Link
                    href={`/auctions/${listing.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Listing
                </Link>
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mb-2">Buyer Chats</h1>
                <p className="text-gray-500 text-sm font-medium mb-8">{listing.title}</p>
                {threads.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
                        <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No buyer has messaged you about this listing yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {threads.map((t) => {
                            const label = getUserDisplayLabel({
                                fullName: t.buyer?.full_name,
                                username: t.buyer?.username,
                                fallbackId: t.buyer_id,
                                genericLabel: 'Buyer',
                            });
                            return (
                                <Link
                                    key={t.buyer_id}
                                    href={`/chat/${listing.id}?buyer=${t.buyer_id}`}
                                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 hover:border-black transition-colors"
                                >
                                    <Avatar src={t.buyer?.avatar_url} name={label} size="md" className="ring-0 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black text-black truncate">{label}</p>
                                        <p className="text-xs text-gray-500 truncate">{t.last_body}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 shrink-0">
                                        {new Date(t.last_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    const buyerId = isSeller ? requestedBuyer! : user!.id;
    const other = isSeller ? buyerProfile : listing.seller;
    const otherLabel = getUserDisplayLabel({
        fullName: other?.full_name,
        username: other?.username,
        fallbackId: other?.id ?? (isSeller ? buyerId : listing.seller_id),
        genericLabel: isSeller ? 'Buyer' : 'Seller',
    });
    const otherFirstName = (other?.full_name ?? (isSeller ? 'Buyer' : 'Seller')).split(' ')[0];

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
            <Link
                href={isSeller ? `/chat/${listing.id}` : `/auctions/${listing.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors mb-6"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                {isSeller ? 'All Buyer Chats' : 'Back to Listing'}
            </Link>

            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">Chat</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                    Private
                </span>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-8">
                Numbers stay private — agree price, payment and pickup here.
            </p>

            <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Item</h3>
                    <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0 overflow-hidden">
                            {listing.auction_images?.[0] ? (
                                <img src={listing.auction_images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-300" />
                                </div>
                            )}
                        </div>
                        <div>
                            <Link
                                href={`/auctions/${listing.id}`}
                                className="font-bold text-black hover:underline underline-offset-2 line-clamp-2 leading-snug mb-1 block"
                            >
                                {listing.title}
                            </Link>
                            {listing.condition && (
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{listing.condition} Condition</p>
                            )}
                            <p className="font-mono font-black text-black">
                                {listing.price_on_request ? 'On request' : formatCurrency(Number(listing.current_price ?? 0))}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{isSeller ? 'Buyer' : 'Seller'}</h3>
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
                </div>

                <OfferChatThread
                    auctionId={listing.id}
                    buyerId={buyerId}
                    userId={user!.id}
                    isSeller={isSeller}
                    otherPartyName={otherFirstName}
                />
            </div>
        </div>
    );
}

export default function ListingChatPage({ params }: ListingChatPageProps) {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        }>
            <ListingChatInner params={params} />
        </Suspense>
    );
}

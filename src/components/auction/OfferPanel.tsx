'use client';



import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { counterOfferAction, makeOfferAction, respondToCounterAction, respondToOfferAction } from '@/app/actions/offer';
import { buyNowAction } from '@/app/actions/buyNow';
import { formatCurrency } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Tag, CheckCircle2, XCircle, Loader2, Send, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';


interface Offer {
    id: string;

    auction_id: string;

    buyer_id: string;

    seller_id: string;

    amount: number;

    status: 'pending' | 'accepted' | 'declined' | 'countered';

    counter_amount?: number | null;

    created_at: string;

    buyer_profile?: { id: string; full_name: string | null; username: string } | null;
}



interface OfferMessage {

    id: string;

    auction_id: string;

    buyer_id: string;

    seller_id: string;

    sender_id: string;

    body: string;

    created_at: string;

}



interface OfferPanelProps {
    auctionId: string;
    isSeller: boolean;
    userId?: string | null;
    isActive?: boolean;
    listingPrice?: number;
    buyNowEnabled?: boolean;
}

export default function OfferPanel({ auctionId, isSeller, userId, isActive = true, listingPrice, buyNowEnabled = true }: OfferPanelProps) {
    const isLoggedIn = !!userId;

    const router = useRouter();

    const [offers, setOffers] = useState<Offer[]>([]);

    const [loading, setLoading] = useState(true);

    const [amount, setAmount] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [formError, setFormError] = useState('');
    const [buyError, setBuyError] = useState('');

    const [responding, setResponding] = useState<string | null>(null);

    const [counterDrafts, setCounterDrafts] = useState<Record<string, string>>({});

    const [openChatBuyerId, setOpenChatBuyerId] = useState<string | null>(null);



    const [chatThreads, setChatThreads] = useState<Record<string, OfferMessage[]>>({});



    const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({});



    const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});



    const [chatSending, setChatSending] = useState<Record<string, boolean>>({});



    const [chatErrors, setChatErrors] = useState<Record<string, string>>({});



    const [chatUnread, setChatUnread] = useState<Record<string, number>>({});



    const chatScrollRef = useRef<HTMLDivElement>(null);

    const openChatBuyerIdRef = useRef<string | null>(null);



    openChatBuyerIdRef.current = openChatBuyerId;

    useEffect(() => {

        const el = chatScrollRef.current;

        if (el) el.scrollTo({ top: el.scrollHeight });

    }, [chatThreads, openChatBuyerId]);

    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [offers]);

    const fetchChatThread = useCallback(async (buyerId: string) => {

        const supabase = createClient();

        // Database types in the repo do not include auction_offer_messages yet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('auction_offer_messages') as any)

            .select('id, auction_id, buyer_id, seller_id, sender_id, body, created_at')

            .eq('auction_id', auctionId)

            .eq('buyer_id', buyerId)

            .order('created_at', { ascending: true });

        if (data) setChatThreads((prev) => ({ ...prev, [buyerId]: data as OfferMessage[] }));

        setChatLoading((prev) => ({ ...prev, [buyerId]: false }));

    }, [auctionId]);
    const fetchOffers = useCallback(async () => {
        if (!userId) { setLoading(false); return; }
        const supabase = createClient();
        // Database types in the repo do not include auction_offers yet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabase.from('auction_offers') as any)
            .select('*, buyer_profile:profiles!buyer_id(id, full_name, username)')
            .eq('auction_id', auctionId)
            .order('created_at', { ascending: true });
        if (!isSeller) q = q.eq('buyer_id', userId);
        const { data } = await q;
        setOffers((data ?? []) as Offer[]);
        // Buyer: preload chat threads for accepted offers so any unread badge shows on arrival
        if (!isSeller) {
            for (const o of (data ?? []) as Offer[]) {
                if (o.status === 'accepted') {
                    setChatLoading((prev) => ({ ...prev, [o.buyer_id]: true }));
                    void fetchChatThread(o.buyer_id);
                }
            }
        }
        setLoading(false);
    }, [auctionId, isSeller, userId, fetchChatThread]);

    useEffect(() => {
        queueMicrotask(() => { void fetchOffers(); });
    }, [fetchOffers]);


    useEffect(() => {

        const supabase = createClient();

        const channel = supabase

            .channel(`offer-chat:${auctionId}`)

            .on('postgres_changes', {

                event: '*', schema: 'public', table: 'auction_offers',

                filter: `auction_id=eq.${auctionId}`,

            }, () => { void fetchOffers(); })

            .on('postgres_changes', {

                event: 'INSERT', schema: 'public', table: 'auction_offer_messages',

                filter: `auction_id=eq.${auctionId}`,

            }, (payload) => {

                const incoming = payload.new as OfferMessage;

                if (!incoming?.id) return;

                setChatThreads((prev) => {

                    const thread = prev[incoming.buyer_id];

                    if (!thread) return prev;

                    if (thread.some((m) => m.id === incoming.id)) return prev;

                    const optIdx = thread.findIndex((m) => m.id.startsWith('opt-') && m.sender_id === incoming.sender_id && m.body === incoming.body);

                    const next = [...thread];

                    if (optIdx !== -1) next[optIdx] = incoming; else next.push(incoming);

                    return { ...prev, [incoming.buyer_id]: next };

                });

                if (incoming.sender_id !== userId && openChatBuyerIdRef.current !== incoming.buyer_id) {

                    setChatUnread((prev) => ({ ...prev, [incoming.buyer_id]: (prev[incoming.buyer_id] ?? 0) + 1 }));

                }

            })

            .subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [auctionId, userId, fetchOffers]);



    const handleBuyNow = () => {
        if (!isLoggedIn) {
            router.push(`/login?redirectTo=/auctions/${auctionId}`);
            return;
        }
        if (!listingPrice || listingPrice <= 0) return;
        setConfirmOpen(true);
    };

    const confirmBuyNow = async () => {
        setSubmitting(true);
        setBuyError('');
        const result = await buyNowAction(auctionId);
        if (!result.success) {
            setSubmitting(false);
            setConfirmOpen(false);
            setBuyError(result.error ?? 'Could not complete the purchase');
            return;
        }
        router.push(`/checkout/${auctionId}`);
    };

    const handleSendOffer = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!isLoggedIn) {

            router.push(`/login?redirectTo=/auctions/${auctionId}`);

            return;

        }

        const parsed = parseFloat(amount.replace(/,/g, ''));

        if (!parsed || parsed <= 0) { setFormError('Enter a valid amount'); return; }

        setSubmitting(true);

        setFormError('');

        const result = await makeOfferAction(auctionId, parsed);

        setSubmitting(false);

        if (!result.success) setFormError(result.error ?? 'Failed to send offer');

        else { trackEvent('submit_offer', { currency: 'GHS', value: parsed }); setAmount(''); void fetchOffers(); }

    };



    const handleRespond = async (offerId: string, response: 'accepted' | 'declined') => {

        setResponding(offerId);

        const result = await respondToOfferAction(offerId, response);

        setResponding(null);

        if (!result.success) alert(result.error ?? 'Something went wrong');

        void fetchOffers();

        if (result.success && response === 'accepted') {

            router.refresh();

            const accepted = offers.find((x) => x.id === offerId);

            if (accepted) {

                setOpenChatBuyerId(accepted.buyer_id);

                setChatLoading((prev) => ({ ...prev, [accepted.buyer_id]: true }));

                void fetchChatThread(accepted.buyer_id);

            }

        }

    };


    const handleCounter = async (offerId: string) => {

        const value = Number(counterDrafts[offerId] ?? '');

        setResponding(offerId);

        const result = await counterOfferAction(offerId, value);

        setResponding(null);

        if (!result.success) alert(result.error ?? 'Something went wrong');

        else setCounterDrafts((d) => ({ ...d, [offerId]: '' }));

        void fetchOffers();

    };



    const handleCounterResponse = async (offerId: string, response: 'accepted' | 'declined') => {

        setResponding(offerId);

        const result = await respondToCounterAction(offerId, response);

        setResponding(null);

        if (!result.success) alert(result.error ?? 'Something went wrong');

        void fetchOffers();

        if (result.success && response === 'accepted') router.refresh();

    };



    const toggleChat = (buyerId: string) => {

        if (openChatBuyerId === buyerId) { setOpenChatBuyerId(null); return; }

        setOpenChatBuyerId(buyerId);

        setChatUnread((prev) => ({ ...prev, [buyerId]: 0 }));

        if (!chatThreads[buyerId]) {

            setChatLoading((prev) => ({ ...prev, [buyerId]: true }));

            void fetchChatThread(buyerId);

        }

    };



    const handleSendChat = async (buyerId: string) => {

        const text = (chatDrafts[buyerId] ?? '').trim();

        if (!text || chatSending[buyerId] || !userId) return;

        setChatSending((prev) => ({ ...prev, [buyerId]: true }));

        setChatErrors((prev) => ({ ...prev, [buyerId]: '' }));

        setChatDrafts((prev) => ({ ...prev, [buyerId]: '' }));

        const optimisticId = `opt-${Date.now()}`;

        const optimistic: OfferMessage = {

            id: optimisticId,

            auction_id: auctionId,

            buyer_id: buyerId,

            seller_id: isSeller ? userId : '',

            sender_id: userId,

            body: text,

            created_at: new Date().toISOString(),

        };

        setChatThreads((prev) => ({ ...prev, [buyerId]: [...(prev[buyerId] ?? []), optimistic] }));

        try {

            const res = await fetch('/api/offers/messages', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify(isSeller

                    ? { auction_id: auctionId, body: text, buyer_id: buyerId }

                    : { auction_id: auctionId, body: text }),

            });

            const json = (await res.json().catch(() => ({}))) as { error?: string; message?: { id?: string } | string };

            if (!res.ok) {

                const msg = json?.error ?? (typeof json?.message === 'string' ? json.message : undefined) ?? 'Failed to send message';

                throw new Error(msg);

            }

            const realId = typeof json?.message === 'object' ? json.message?.id : undefined;

            if (realId) {

                setChatThreads((prev) => ({

                    ...prev,

                    [buyerId]: (prev[buyerId] ?? []).map((m) => (m.id === optimisticId ? { ...m, id: realId } : m)),

                }));

            }

            trackEvent('send_message', { context: 'offer_chat' });

        } catch (err) {

            setChatThreads((prev) => ({ ...prev, [buyerId]: (prev[buyerId] ?? []).filter((m) => m.id !== optimisticId) }));

            setChatDrafts((prev) => ({ ...prev, [buyerId]: text }));

            setChatErrors((prev) => ({ ...prev, [buyerId]: err instanceof Error ? err.message : 'Failed to send message' }));

        }

        setChatSending((prev) => ({ ...prev, [buyerId]: false }));

    };
    if (loading) return null;

    // Don't render at all if auction is inactive and there's nothing to show

    if (!isActive && offers.length === 0) return null;



    const hasPending = !isSeller && offers.some((o) => o.status === 'pending' || o.status === 'countered');



    return (
        <>
        {/* The primary purchase CTAs (and the enquiry-only note) are presented once in the
            listing header and sticky bar. The real Buy now button stays mounted here, hidden,
            so those CTAs click through to the same handler, confirm dialog and login redirect. */}
        {!isSeller && isActive && listingPrice && buyNowEnabled ? (
            <>
                <button
                    id="buy-now-button"
                    type="button"
                    onClick={handleBuyNow}
                    disabled={submitting}
                    hidden
                    aria-hidden="true"
                    tabIndex={-1}
                >
                    Buy now - {formatCurrency(listingPrice)}
                </button>
                {buyError && (
                    <p role="alert" className="mt-4 text-xs font-semibold text-red-500">{buyError}</p>
                )}
                <ConfirmDialog
                    open={confirmOpen}
                    title="Buy this item?"
                    message={`You are buying this item for ${formatCurrency(listingPrice)}. After this you and the seller agree how to pay and collect it. AuctionsGH does not take payment.`}
                    confirmLabel={`Buy for ${formatCurrency(listingPrice)}`}
                    busy={submitting}
                    onConfirm={confirmBuyNow}
                    onCancel={() => setConfirmOpen(false)}
                />
            </>
        ) : null}
        <div id="offer-panel" className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
                <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <p className="text-[11px] font-black text-black uppercase tracking-widest">
                    {isSeller ? 'Buyer Offers' : 'Make an Offer'}
                </p>
            </div>


            {/* Chat messages */}

            <div className={`${openChatBuyerId ? 'max-h-none' : 'max-h-60'} overflow-y-auto px-4 py-3 space-y-3 bg-gray-50`}>

                {offers.length === 0 ? (

                    <div className={listingPrice && !isSeller ? "py-3 text-center" : "py-8 text-center"}>

                        <Tag className="h-6 w-6 text-gray-200 mx-auto mb-2" />

                        <p className="text-xs text-gray-400">

                            {isSeller

                                ? 'No offers yet. Buyers can send you a fixed-price offer.'

                                : listingPrice ? 'Want a different price? Send the seller an offer below.' : 'Send the seller a price offer below.'}

                        </p>

                    </div>

                ) : (

                    offers.map((o) => {

                        const isMine = o.buyer_id === userId;

                        const buyerName = o.buyer_profile

                            ? (o.buyer_profile.full_name || o.buyer_profile.username || 'Buyer')

                            : 'Buyer';

                        const isResponding = responding === o.id;



                        return (

                            <div key={o.id} className="space-y-1.5">

                                {/* Label for seller view */}
                                {isSeller && (
                                    o.buyer_profile?.id ? (
                                        <Link href={`/users/${o.buyer_profile.id}`} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-black">
                                            {buyerName}
                                        </Link>
                                    ) : (
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{buyerName}</p>
                                    )
                                )}


                                {/* Offer bubble */}

                                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>

                                    <div className={`max-w-[82%] px-4 py-3 text-sm leading-snug ${

                                        isMine

                                            ? 'bg-black text-white'

                                            : 'bg-white border border-gray-200 text-black'

                                    }`}>

                                        <p>

                                            Will you accept{' '}

                                            <span className="font-bold">{formatCurrency(o.amount)}</span>{' '}

                                            for this item?

                                        </p>

                                        <p className="text-[10px] mt-1.5 opacity-50 text-right">

                                            {new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}

                                        </p>

                                    </div>

                                </div>



                                {/* Seller Yes / No buttons — only on pending, only for seller */}

                                {isSeller && o.status === 'pending' && (

                                    <div className="flex gap-1.5">

                                        <button

                                            onClick={() => handleRespond(o.id, 'accepted')}

                                            disabled={!!responding}

                                            className="flex-1 py-2 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"

                                        >

                                            {isResponding

                                                ? <Loader2 className="h-3 w-3 animate-spin" />

                                                : <CheckCircle2 className="h-3 w-3" />}

                                            Yes

                                        </button>

                                        <button

                                            onClick={() => handleRespond(o.id, 'declined')}

                                            disabled={!!responding}

                                            className="flex-1 py-2 rounded-lg bg-white text-black border border-gray-200 text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"

                                        >

                                            {isResponding

                                                ? <Loader2 className="h-3 w-3 animate-spin" />

                                                : <XCircle className="h-3 w-3 text-red-400" />}

                                            No

                                        </button>

                                    </div>

                                )}



                                {isSeller && o.status === 'pending' && (

                                    <div className="flex gap-1.5 mt-1.5">

                                        <input

                                            type="number"

                                            min={1}

                                            inputMode="numeric"

                                            placeholder="Counter (GHS)"

                                            value={counterDrafts[o.id] ?? ''}

                                            onChange={(e) => setCounterDrafts((d) => ({ ...d, [o.id]: e.target.value }))}

                                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-400"

                                        />

                                        <button

                                            onClick={() => handleCounter(o.id)}

                                            disabled={!!responding || !(counterDrafts[o.id] ?? '').trim()}

                                            className="px-4 py-2 bg-white text-black border border-black text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-50"

                                        >

                                            Counter

                                        </button>

                                    </div>

                                )}



                                {/* Response bubble */}

                                {o.status !== 'pending' && (

                                    <div className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>

                                        <div className={`max-w-[82%] px-4 py-2.5 text-sm ${

                                            o.status === 'accepted'

                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'

                                                : o.status === 'countered'

                                                    ? 'bg-amber-50 border border-amber-200 text-amber-800'

                                                    : 'bg-red-50 border border-red-100 text-red-700'

                                        }`}>

                                            {o.status === 'accepted'

                                                ? '✓ Yes — offer accepted!'

                                                : o.status === 'countered'

                                                    ? (isSeller

                                                        ? `Counter sent: GHS ${Number(o.counter_amount ?? 0).toLocaleString()} - waiting for buyer`

                                                        : `Seller countered: GHS ${Number(o.counter_amount ?? 0).toLocaleString()}`)

                                                    : '✗ No — offer declined.'}

                                        </div>

                                    </div>

                                )}



                                {/* Buyer answers a counter-offer */}

                                {!isSeller && o.status === 'countered' && (

                                    <div className="flex justify-end gap-1.5">

                                        <button

                                            onClick={() => handleCounterResponse(o.id, 'accepted')}

                                            disabled={!!responding}

                                            className="mt-1 px-4 py-2 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"

                                        >

                                            {isResponding

                                                ? <Loader2 className="h-3 w-3 animate-spin" />

                                                : <CheckCircle2 className="h-3 w-3" />}

                                            Accept GHS {Number(o.counter_amount ?? 0).toLocaleString()}

                                        </button>

                                        <button

                                            onClick={() => handleCounterResponse(o.id, 'declined')}

                                            disabled={!!responding}

                                            className="mt-1 px-4 py-2 rounded-lg bg-white text-black border border-gray-200 text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"

                                        >

                                            <XCircle className="h-3 w-3 text-red-400" />

                                            Decline

                                        </button>

                                    </div>

                                )}



                                {/* Seller can text the buyer once an offer is accepted */}

                                {isSeller && o.status === 'accepted' && (

                                    <div className="flex justify-end">

                                        <button

                                            onClick={() => toggleChat(o.buyer_id)}

                                            className="mt-1 px-4 py-2 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors flex items-center gap-1.5"

                                        >

                                            <MessageCircle className="h-3 w-3" />

                                            Message {buyerName}

                                            {(chatUnread[o.buyer_id] ?? 0) > 0 && (

                                                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-black text-white">

                                                    {chatUnread[o.buyer_id]}

                                                </span>

                                            )}

                                        </button>

                                    </div>

                                )}

                                {/* Chat + checkout CTAs for buyer on accepted offer */}

                                {!isSeller && o.status === 'accepted' && (

                                    <div className="flex flex-wrap justify-end gap-1.5">

                                        <button

                                            onClick={() => toggleChat(o.buyer_id)}

                                            className="mt-1 px-4 py-2 rounded-lg bg-white text-black border border-black text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors flex items-center gap-1.5"

                                        >

                                            <MessageCircle className="h-3 w-3" />

                                            Message seller

                                            {(chatUnread[o.buyer_id] ?? 0) > 0 && (

                                                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-black text-white">

                                                    {chatUnread[o.buyer_id]}

                                                </span>

                                            )}

                                        </button>

                                        <button

                                            onClick={() => router.push(`/checkout/${auctionId}`)}

                                            className="mt-1 px-4 py-2 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors flex items-center gap-1.5"

                                        >

                                            <CheckCircle2 className="h-3 w-3" />

                                            Proceed to Checkout →

                                        </button>

                                    </div>

                                )}

                                {/* Chat thread for an accepted offer */}

                                {o.status === 'accepted' && openChatBuyerId === o.buyer_id && (

                                    <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white">

                                        <div ref={chatScrollRef} className="max-h-48 space-y-2 overflow-y-auto bg-gray-50 px-3 py-2.5">

                                            {chatLoading[o.buyer_id] && (chatThreads[o.buyer_id] ?? []).length === 0 ? (

                                                <div className="flex justify-center py-3">

                                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />

                                                </div>

                                            ) : (chatThreads[o.buyer_id] ?? []).length === 0 ? (

                                                <p className="py-3 text-center text-[11px] text-gray-400">

                                                    {isSeller

                                                        ? `No messages yet. Text ${buyerName} to arrange payment and pickup.`

                                                        : 'No messages yet. Text the seller to arrange payment and pickup.'}

                                                </p>

                                            ) : (

                                                (chatThreads[o.buyer_id] ?? []).map((m) => {

                                                    const mine = m.sender_id === userId;

                                                    return (

                                                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>

                                                            <div className={`max-w-[82%] px-3.5 py-2 text-sm leading-snug ${

                                                                mine

                                                                    ? 'bg-black text-white'

                                                                    : 'bg-white border border-gray-200 text-black'

                                                            } ${m.id.startsWith('opt-') ? 'opacity-60' : ''}`}>

                                                                <p className="whitespace-pre-wrap wrap-break-word">{m.body}</p>

                                                                <p className="mt-1 text-right text-[10px] opacity-50">

                                                                    {m.id.startsWith('opt-')

                                                                        ? 'Sending…'

                                                                        : new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}

                                                                </p>

                                                            </div>

                                                        </div>

                                                    );

                                                })

                                            )}

                                        </div>

                                        {chatErrors[o.buyer_id] && (

                                            <p className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600">

                                                {chatErrors[o.buyer_id]}

                                            </p>

                                        )}

                                        <form

                                            onSubmit={(e) => { e.preventDefault(); void handleSendChat(o.buyer_id); }}

                                            className="flex items-center gap-2 border-t border-gray-200 bg-white p-2.5"

                                        >

                                            <input

                                                type="text"

                                                value={chatDrafts[o.buyer_id] ?? ''}

                                                onChange={(e) => setChatDrafts((d) => ({ ...d, [o.buyer_id]: e.target.value }))}

                                                placeholder={isSeller ? `Message ${buyerName}…` : 'Message the seller…'}

                                                maxLength={2000}

                                                className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-amber-400"

                                            />

                                            <button

                                                type="submit"

                                                disabled={!(chatDrafts[o.buyer_id] ?? '').trim() || !!chatSending[o.buyer_id]}

                                                className="shrink-0 px-3.5 py-2 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"

                                                aria-label="Send message"

                                            >

                                                {chatSending[o.buyer_id]

                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />

                                                    : <Send className="h-3.5 w-3.5" />}

                                            </button>

                                        </form>

                                    </div>

                                )}

                            </div>

                        );

                    })

                )}

                <div ref={bottomRef} />

            </div>



            {/* Input area — buyer only, auction must be active */}

            {!isSeller && isActive && (

                <form onSubmit={handleSendOffer} className="border-t border-gray-200 bg-white">
                    

                    {formError && (

                        <p className="px-4 pt-2 text-[11px] text-red-500 font-semibold">{formError}</p>

                    )}

                    {hasPending && (

                        <p className="px-4 pt-2 text-[10px] text-amber-600 italic">

                            Sending a new offer will replace your pending one.

                        </p>

                    )}

                    <div className="p-3 flex gap-2">

                        <div className={`flex flex-1 min-w-0 items-center border transition-colors focus-within:border-black ${

                            formError ? 'border-red-400' : 'border-gray-200'

                        }`}>

                            <span className="px-2.5 py-2.5 text-xs font-semibold text-gray-500 border-r border-gray-200 bg-gray-50 select-none">GHS</span>

                            <input
                                id="offer-amount-input"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value.replace(/[^0-9]/g, ''));
                                    setFormError('');
                                }}
                                placeholder="Your offer amount"
                                className="flex-1 min-w-0 w-full px-3 py-2.5 text-sm text-black placeholder-gray-400 bg-white focus:outline-none"
                            />
                        </div>

                        <button

                            type="submit"

                            disabled={!amount || submitting}

                            className="shrink-0 px-4 py-2.5 rounded-lg bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"

                        >

                            {submitting

                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />

                                : <Send className="h-3.5 w-3.5" />}

                            Offer

                        </button>

                    </div>

                    <p className="px-4 pb-2.5 text-[10px] text-gray-400 italic">

                        Sent as: &ldquo;Will you accept GHS [amount] for this item?&rdquo;

                    </p>

                </form>

            )}



            {/* Seller footer note */}

            {isSeller && (

                <div className="border-t border-gray-100 px-4 py-2.5">

                    <p className="text-[10px] text-gray-400 text-center">Respond Yes or No to each offer, or send a counter price. Message the buyer once accepted to arrange payment and pickup.</p>

                </div>

            )}

        </div>
        </>

    );
}

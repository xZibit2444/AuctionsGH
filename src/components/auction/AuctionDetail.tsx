'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { useBids } from '@/hooks/useBids';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';
import { useAuth } from '@/hooks/useAuth';
import { useSavedAuctions } from '@/hooks/useSavedAuctions';
import { formatCurrency, getUserDisplayLabel } from '@/lib/utils';
import { CONDITION_LABELS } from '@/lib/constants';
import AuctionCountdown from './AuctionCountdown';
import AuctionStatusBadge from './AuctionStatusBadge';
import BidForm from '@/components/bidding/BidForm';
import BidHistory from '@/components/bidding/BidHistory';
import WinnerBanner from '@/components/bidding/WinnerBanner';
import Avatar from '@/components/ui/Avatar';
import SellerRating from '@/components/ui/SellerRating';
import FavoriteSellerButton from '@/components/seller/FavoriteSellerButton';
import OfferPanel from './OfferPanel';
import AuctionComments from './AuctionComments';
import { Heart, CheckCircle2, Trash2, Sparkles, Trophy, Clock3, ArrowRight, X } from 'lucide-react';
import type { BidWithBidder } from '@/types/bid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuctionStatus } from '@/types/database';
import { finalizeAuctionAction } from '@/app/actions/finalizeAuction';
import { deleteAuctionAction } from '@/app/actions/deleteAuction';

interface AuctionDetailProps {
    auctionId: string;
}

type AuctionDetailData = {
    orders?: { id: string; status: string }[] | { id: string; status: string } | null;
    auction_winner_notes?: { note: string }[] | { note: string } | null;
    profiles?: {
        id: string;
        username: string;
        avatar_url: string | null;
        location: string | null;
        is_verified: boolean;
        full_name?: string | null;
    } | null;
};

export default function AuctionDetail({ auctionId }: AuctionDetailProps) {
    const { auction, loading, setAuction } = useAuction(auctionId);
    const { bids, setBids, loading: bidsLoading } = useBids(auctionId);
    const { user } = useAuth();
    const { savedIds, toggleSave } = useSavedAuctions();
    const [selectedImage, setSelectedImage] = useState(0);
    const [savePending, setSavePending] = useState(false);
    const [showCongrats, setShowCongrats] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const finalizeStartedRef = useRef(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!deleteConfirm) { setDeleteConfirm(true); return; }
        setDeleteLoading(true);
        const result = await deleteAuctionAction(auctionId);
        setDeleteLoading(false);
        if (result.success) {
            router.push('/dashboard');
        } else {
            alert(result.error ?? 'Failed to delete auction');
            setDeleteConfirm(false);
        }
    };

    const isSaved = savedIds.has(auctionId);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (savePending) return;
        setSavePending(true);
        await toggleSave(auctionId);
        setSavePending(false);
    };

    const handleNewBid = useCallback(
        (bid: BidWithBidder) => {
            setBids((prev) => [bid, ...prev]);
            setAuction((prev) =>
                prev
                    ? {
                          ...prev,
                          current_price: bid.amount,
                          bid_count: prev.bid_count + 1,
                      }
                    : prev
            );
        },
        [setAuction, setBids]
    );

    const handleAuctionUpdate = useCallback(
        (payload: Record<string, unknown>) => {
            const newStatus = payload.status as AuctionStatus;
            const newWinnerId = payload.winner_id as string | null;

            setAuction((prev) => {
                if (!prev) return prev;
                if (prev.status === 'active' && newStatus === 'sold' && newWinnerId === user?.id) {
                    setShowCongrats(true);
                }
                return {
                    ...prev,
                    status: newStatus,
                    winner_id: newWinnerId,
                };
            });
        },
        [setAuction, user?.id]
    );

    useRealtimeBids({
        auctionId,
        onNewBid: handleNewBid,
        onAuctionUpdate: handleAuctionUpdate,
    });

    const handleCountdownEnd = useCallback(async () => {
        if (auction?.status !== 'active' || finalizeStartedRef.current) return;

        finalizeStartedRef.current = true;
        const highestBidderId = bids[0]?.bidder_id;

        try {
            await finalizeAuctionAction(auctionId);

            if (highestBidderId === user?.id) {
                setShowCongrats(true);
            }

            setAuction((prev) => prev ? { ...prev, status: highestBidderId ? 'sold' : 'ended' } : prev);
        } finally {
            finalizeStartedRef.current = false;
        }
    }, [auction, bids, user?.id, setAuction, auctionId]);

    if (loading || !auction) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    const auctionData = auction as typeof auction & AuctionDetailData;
    const images = auction.auction_images?.sort((a, b) => a.position - b.position) ?? [];
    const isWinner = auction.winner_id === user?.id;
    const isSeller = auction.seller_id === user?.id;
    const orderRaw = auctionData.orders;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
    const winnerNoteRaw = auctionData.auction_winner_notes;
    const winnerNote = Array.isArray(winnerNoteRaw) ? winnerNoteRaw[0]?.note : winnerNoteRaw?.note;
    const sellerDisplayName = auctionData.profiles?.full_name?.trim()
        || auctionData.profiles?.username?.trim()
        || `Seller ${auction.seller_id.slice(0, 6).toUpperCase()}`;
    const sellerLabel = getUserDisplayLabel({
        fullName: auctionData.profiles?.full_name,
        username: auctionData.profiles?.username,
        fallbackId: auction.seller_id,
    });

    return (
        <div className="max-w-5xl mx-auto py-4 sm:py-8">
            {/* Winner Banner */}
            {isWinner && auction.status === 'sold' && (
                <WinnerBanner
                    auctionId={auction.id}
                    auctionTitle={auction.title}
                    amount={auction.current_price}
                    orderId={order?.id}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {/* Left — Images */}
                <div className="space-y-4">
                    <div className="aspect-square bg-gray-50 border border-gray-200">
                        {images.length > 0 ? (
                            <img
                                src={images[selectedImage]?.url}
                                alt={auction.title}
                                loading="eager"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Thumbnail strip */}
                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 mt-4">
                            {images.map((img, i) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedImage(i)}
                                    className={`flex-shrink-0 w-16 h-16 border-2 transition-colors ${i === selectedImage
                                        ? 'border-black'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img
                                        src={img.url}
                                        alt=""
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right — Details */}
                <div className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <AuctionStatusBadge status={auction.status} />

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${isSaved
                                    ? 'border-black text-black bg-gray-50'
                                    : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'
                                    } ${savePending ? 'opacity-50' : ''}`}
                            >
                                <Heart
                                    className="h-4 w-4"
                                    fill={isSaved ? 'currentColor' : 'none'}
                                    strokeWidth={2}
                                />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {isSaved ? 'Saved' : 'Save'}
                                </span>
                            </button>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {auction.title}
                        </h1>
                    </div>

                    {/* Seller */}
                    <div className="flex items-start justify-between gap-3">
                        <Link href={`/sellers/${auction.seller_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                            <Avatar
                                src={auctionData.profiles?.avatar_url}
                                name={sellerDisplayName}
                                size="sm"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                                        {sellerLabel || 'Seller'}
                                    </p>
                                    {auction.profiles?.is_verified && (
                                        <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Verified
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">{auction.profiles?.location}</p>
                                {auction.profiles?.id && (
                                    <SellerRating sellerId={auction.profiles.id} />
                                )}
                            </div>
                        </Link>
                        <FavoriteSellerButton
                            sellerId={auction.seller_id}
                            sellerName={sellerLabel}
                            compact
                            className="shrink-0"
                        />
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {[
                            { label: 'Brand', value: auction.brand },
                            { label: 'Model', value: auction.model },
                            { label: 'Condition', value: CONDITION_LABELS[auction.condition] },
                            { label: 'Storage', value: auction.storage_gb ? `${auction.storage_gb} GB` : '—' },
                            { label: 'RAM', value: auction.ram_gb ? `${auction.ram_gb} GB` : '—' },
                            { label: 'City', value: auction.listing_city ?? 'Accra' },
                            { label: 'Meetup Area', value: auction.meetup_area ?? 'Accra Central' },
                            { label: 'Delivery', value: auction.delivery_available ? 'Available' : 'Not available' },
                            { label: 'Inspect First', value: auction.inspection_available ? 'Yes' : 'No' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white border border-gray-200 px-4 py-3">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                                <p className="text-sm font-bold text-black">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Price + Countdown */}
                    <div className="border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Bid</p>
                                <p className="text-4xl font-extrabold text-black tracking-tight">
                                    {formatCurrency(auction.current_price)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-black bg-gray-100 px-2 py-1 inline-block mb-1 border border-gray-200">
                                    {auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {auction.status === 'active' && (
                            <AuctionCountdown endTime={auction.ends_at} onEnd={handleCountdownEnd} />
                        )}
                    </div>

                    {/* Bid Form */}
                    {auction.status === 'active' && !isSeller && (
                        <BidForm
                            auctionId={auction.id}
                            currentPrice={auction.current_price}
                            minIncrement={auction.min_increment}
                        />
                    )}

                    {/* Offer panel for buyers (logged-in or not) */}
                    {!isSeller && (
                        <OfferPanel
                            auctionId={auction.id}
                            isSeller={false}
                            userId={user?.id}
                            auctionTitle={auction.title}
                            isActive={auction.status === 'active'}
                        />
                    )}

                    {isSeller && auction.status === 'active' && (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                            You cannot bid on your own auction.
                        </div>
                    )}

                    {/* Incoming offers panel for the seller — always show so history is visible */}
                    {isSeller && (
                        <OfferPanel
                            auctionId={auction.id}
                            isSeller={true}
                            userId={user!.id}
                            auctionTitle={auction.title}
                            isActive={auction.status === 'active'}
                        />
                    )}

                    {/* Delete / take down button */}
                    {isSeller && (((auction.status !== 'sold' && auction.bid_count === 0) || (auction.status === 'sold' && (order?.status === 'completed' || order?.status === 'pin_verified')))) && (
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border transition-colors disabled:opacity-50 ${deleteConfirm ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-white text-red-600 border-red-300 hover:bg-red-50'}`}
                            >
                                <Trash2 className="h-4 w-4" />
                                {deleteLoading ? 'Deleting…' : deleteConfirm ? 'Confirm delete' : auction.status === 'sold' ? 'Take down listing' : 'Delete auction'}
                            </button>
                            {deleteConfirm && (
                                <button
                                    onClick={() => setDeleteConfirm(false)}
                                    className="ml-2 px-4 py-2 text-sm text-gray-500 hover:text-black border border-gray-200 bg-white transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    {auction.description && (
                        <div className="bg-gray-50 p-5 mt-2 border border-gray-200">
                            <h2 className="text-sm font-bold text-black mb-2 uppercase tracking-wide">
                                Description
                            </h2>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                {auction.description}
                            </p>
                        </div>
                    )}

                    <AuctionComments
                        auctionId={auction.id}
                        currentUserId={user?.id}
                    />

                    {isWinner && auction.status === 'sold' && winnerNote && (
                        <div className="border border-emerald-200 bg-emerald-50 p-5 mt-2">
                            <h2 className="text-sm font-bold text-emerald-800 mb-2 uppercase tracking-wide">
                                Seller Note (Winner Only)
                            </h2>
                            <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">
                                {winnerNote}
                            </p>
                        </div>
                    )}

                    {/* Bid History */}
                    <BidHistory bids={bids} loading={bidsLoading} />
                </div>
            </div>

            {/* Congrats Modal Overlay */}
            {showCongrats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md overflow-hidden border border-emerald-200 bg-white shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-emerald-100 via-white to-amber-100" />
                        <button
                            onClick={() => setShowCongrats(false)}
                            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center border border-black/10 bg-white/90 text-gray-500 transition-colors hover:text-black"
                            aria-label="Close winner popup"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="relative p-6 sm:p-8">
                            <div className="mb-5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Winning Bid
                                </span>
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg">
                                    <Trophy className="h-7 w-7" />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-3xl font-black tracking-tight text-black sm:text-4xl">You won this auction.</h2>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                    Your bid came out on top. Confirm the order within <span className="font-black text-black">30 minutes</span> to secure the item before the reservation window closes.
                                </p>
                            </div>

                            <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Item Won</p>
                                    <p className="mt-2 text-lg font-black leading-tight text-black">{auction.title}</p>
                                </div>
                                <div className="border border-black bg-black px-5 py-4 text-white">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Winning Price</p>
                                    <p className="mt-2 text-2xl font-black tracking-tight">{formatCurrency(auction.current_price)}</p>
                                </div>
                            </div>

                            <div className="mb-6 flex items-center gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <Clock3 className="h-4 w-4 shrink-0" />
                                <p className="leading-relaxed">
                                    After you confirm, you&apos;ll get the seller&apos;s handoff details and delivery instructions.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => router.push(`/checkout/${auction.id}`)}
                                    className="inline-flex w-full items-center justify-center gap-2 bg-black px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-gray-900"
                                >
                                    Confirm Order
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setShowCongrats(false)}
                                    className="inline-flex w-full items-center justify-center border border-gray-200 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-colors hover:border-black"
                                >
                                    Keep Browsing
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { useBids } from '@/hooks/useBids';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';
import { useAuth } from '@/hooks/useAuth';
import { useSavedAuctions } from '@/hooks/useSavedAuctions';
import { formatCurrency, formatAuctionLocation, getUserDisplayLabel } from '@/lib/utils';
import { CONDITION_LABELS } from '@/lib/constants';
import OwnerStatusControls from '@/components/auction/OwnerStatusControls';
import { SIM_TYPE_OPTIONS, NETWORK_LOCK_OPTIONS, specFieldsForCategory } from '@/lib/listingEdit';

const SIM_TYPE_LABELS: Record<string, string> = Object.fromEntries(SIM_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const NETWORK_LOCK_LABELS: Record<string, string> = Object.fromEntries(NETWORK_LOCK_OPTIONS.map((o) => [o.value, o.label]));
import { getListingType, getListingTypeLabel } from '@/lib/listings';
import AuctionCountdown from './AuctionCountdown';
import AuctionStatusBadge from './AuctionStatusBadge';
import ListingGallery from './ListingGallery';
import BidForm from '@/components/bidding/BidForm';
import BidHistory from '@/components/bidding/BidHistory';
import WinnerBanner from '@/components/bidding/WinnerBanner';
import Avatar from '@/components/ui/Avatar';
import SellerRating from '@/components/ui/SellerRating';
import FavoriteSellerButton from '@/components/seller/FavoriteSellerButton';
import ShareButton from '@/components/ui/ShareButton';
import OfferPanel from './OfferPanel';
import AuctionComments from './AuctionComments';
import { Heart, Pencil, CheckCircle2, Trash2, Sparkles, Trophy, Clock3, ArrowRight, X, ChevronRight } from 'lucide-react';
import type { BidWithBidder } from '@/types/bid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AuctionStatus } from '@/types/database';
import { finalizeAuctionAction } from '@/app/actions/finalizeAuction';
import { deleteAuctionAction } from '@/app/actions/deleteAuction';
import { relistAuctionAction } from '@/app/actions/relistAuction';

interface AuctionDetailProps {
    auctionId: string;
}

type AuctionDetailData = {
    listing_videos?: { id: string; content_type: string; duration_seconds: number | null }[] | null;
    orders?: { id: string; status: string }[] | { id: string; status: string } | null;
    auction_offers?: { status: string }[] | null;
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
    const { user, profile } = useAuth();
    const { savedIds, toggleSave } = useSavedAuctions();
    const [savePending, setSavePending] = useState(false);
    const [showCongrats, setShowCongrats] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [relistLoading, setRelistLoading] = useState(false);
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

    const handleRelist = async () => {
        setRelistLoading(true);
        const result = await relistAuctionAction(auctionId);
        setRelistLoading(false);

        if (result.success && result.auctionId) {
            router.push(`/auctions/${result.auctionId}`);
            return;
        }

        alert(result.error ?? 'Failed to relist item');
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
    const listingType = getListingType(auction);
    const isPermanent = listingType === 'permanent';
    const images = auction.auction_images?.sort((a, b) => a.position - b.position) ?? [];
    const isWinner = auction.winner_id === user?.id;
    const isSeller = auction.seller_id === user?.id;
    const isAdmin = profile?.is_super_admin === true;
    const orderRaw = auctionData.orders;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
    const hasAcceptedOffer = (auctionData.auction_offers ?? []).some((offer) => offer.status === 'accepted');
    const completedDeal = order?.status === 'completed' || order?.status === 'pin_verified';
    const canSellerDelete = !hasAcceptedOffer
        && (auction.status !== 'sold' || completedDeal);
    const canRelist = isSeller
        && !hasAcceptedOffer
        && (auction.status === 'ended' || (auction.status === 'sold' && completedDeal));
    const canDelete = isSeller ? canSellerDelete : isAdmin;
    const listingVideo = (auctionData.listing_videos ?? [])[0] ?? null;
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
    const buyNowEnabled = (auction as { allow_buy_now?: boolean }).allow_buy_now !== false;
    const isActive = auction.status === 'active';
    const showBuyerCtas = !isSeller && isActive;
    const canBuyNow = isPermanent && buyNowEnabled && auction.current_price > 0;

    const scrollToOffer = () => {
        document.getElementById('offer-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => {
            const input = document.getElementById('offer-amount-input') as HTMLInputElement | null;
            input?.focus({ preventScroll: true });
        }, 450);
    };

    const clickBuyNow = () => {
        document.getElementById('buy-now-button')?.click();
    };

    const scrollToBid = () => {
        document.getElementById('bid-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const statusPill = isActive ? (
        <span className="inline-block rounded-md bg-emerald-600 px-[9px] py-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-white sm:px-2.5 sm:py-[5px] sm:text-[11px]">
            Live
        </span>
    ) : (
        <AuctionStatusBadge status={auction.status} />
    );

    const galleryActions = (
        <>
            <ShareButton
                title={auction.title}
                url={`/auctions/${auction.id}`}
                compact
                label=""
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-sm backdrop-blur transition hover:text-black"
            />
            <button
                type="button"
                onClick={handleSave}
                aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition ${isSaved
                    ? 'border-amber-400 bg-amber-400 text-black'
                    : 'border-stone-200 bg-white/95 text-stone-700 hover:text-black'
                    } ${savePending ? 'opacity-50' : ''}`}
            >
                <Heart className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>
        </>
    );

    const metaPills = (
        <div className="flex flex-wrap items-center gap-2">
            <span className="hidden rounded-full bg-emerald-600 px-2.5 py-[3px] text-xs font-extrabold uppercase leading-[1.2] tracking-[0.05em] text-white sm:inline-block">Live</span>
            <span className="rounded-full border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 sm:py-[3px] sm:text-xs">
                {getListingTypeLabel(listingType)}
            </span>
            {auction.brand && (
                <span className="rounded-full border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 sm:py-[3px] sm:text-xs">
                    {auction.brand}
                </span>
            )}
        </div>
    );

    const priceSubline = isPermanent
        ? buyNowEnabled
            ? 'Fixed price · or make an offer · stays live until sold'
            : 'Fixed price · make an offer or message us · stays live until sold'
        : `${auction.bid_count} bid${auction.bid_count !== 1 ? 's' : ''} · auction ends when the timer runs out`;

    const sellerCard = (
        <div className="flex items-center gap-3 border-t border-stone-200 pt-4 sm:mt-[18px]">
            <Link href={`/users/${auction.seller_id}`} className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80">
                <Avatar
                    src={auctionData.profiles?.avatar_url}
                    name={sellerDisplayName}
                    size="sm"
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-sm font-bold text-stone-900">
                            {sellerLabel || 'Seller'}
                        </p>
                        {auction.profiles?.is_verified && (
                            <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-stone-500">
                        {auction.profiles?.location}
                    </p>
                    {auction.profiles?.id && (
                        <SellerRating sellerId={auction.profiles.id} />
                    )}
                </div>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-stone-400" />
            </Link>
            <FavoriteSellerButton
                sellerId={auction.seller_id}
                sellerName={sellerLabel}
                compact
                className="shrink-0"
            />
        </div>
    );

    const specFields = specFieldsForCategory(auction.brand);
    const facts: { label: string; value: string }[] = [
        { label: 'Category', value: auction.brand },
        { label: 'Brand / Model', value: auction.model || '—' },
        { label: 'Condition', value: CONDITION_LABELS[auction.condition] },
        ...(specFields.storage ? [{ label: 'Storage', value: auction.storage_gb ? `${auction.storage_gb} GB` : '—' }] : []),
        ...(specFields.battery && auction.battery_health != null ? [{ label: 'Battery health', value: `${auction.battery_health}%` }] : []),
        ...(specFields.sim && auction.sim_type ? [{ label: 'SIM', value: SIM_TYPE_LABELS[auction.sim_type] ?? '—' }] : []),
        ...(specFields.lock && auction.network_lock ? [{ label: 'Network lock', value: NETWORK_LOCK_LABELS[auction.network_lock] ?? '—' }] : []),
        ...(auction.faults ? [{ label: 'Known faults', value: auction.faults }] : []),
        { label: 'Region', value: auction.listing_city ?? 'Greater Accra' },
        { label: 'Location', value: auction.meetup_area ?? 'Accra Central' },
        ...(typeof auction.delivery_available === 'boolean'
            ? [{ label: 'Delivery', value: auction.delivery_available ? 'Available' : 'Not available' }]
            : []),
    ];

    const factsRows = (
        <div className="border-t border-stone-200 sm:mt-[14px]">
            {facts.map(({ label, value }) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b border-stone-200 py-[9px] leading-[1.2] text-[13.5px] last:border-b-0">
                    <span className="text-stone-500">{label}</span>
                    <span className="text-right font-semibold text-stone-900">{value}</span>
                </div>
            ))}
        </div>
    );

    const buyerCtas = showBuyerCtas && (
        <div className={`space-y-3 sm:mt-[18px] ${isPermanent && !buyNowEnabled ? '' : 'hidden sm:block'}`}>
            <div className="hidden gap-2.5 sm:flex">
                <button
                    type="button"
                    onClick={scrollToOffer}
                    className="flex-1 rounded-xl bg-amber-400 px-4 py-3.5 text-sm font-bold sm:text-[15px] text-black transition-colors hover:bg-amber-300"
                >
                    Make an offer
                </button>
                {canBuyNow && (
                    <button
                        type="button"
                        onClick={clickBuyNow}
                        className="flex-1 rounded-xl bg-black px-4 py-3.5 text-sm font-bold sm:text-[15px] text-white transition-colors hover:bg-stone-800"
                    >
                        Buy now
                    </button>
                )}
                {!isPermanent && (
                    <button
                        type="button"
                        onClick={scrollToBid}
                        className="flex-1 rounded-xl bg-black px-4 py-3.5 text-sm font-bold sm:text-[15px] text-white transition-colors hover:bg-stone-800"
                    >
                        Place a bid
                    </button>
                )}
            </div>
            {isPermanent && !buyNowEnabled && (
                <p className="text-xs text-stone-500">
                    Availability confirmed on enquiry. Make an offer or message us and we confirm the item is still available before any sale.
                </p>
            )}
        </div>
    );

    const manageCard = (isSeller || isAdmin) && (
        <div className="space-y-3 sm:mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-stone-500">
                    {isSeller ? 'You listed this item' : 'Admin controls'}
                </p>
                <span className="text-[13px] font-bold text-stone-900">Manage</span>
            </div>
            {(isSeller || isAdmin) && auction.status !== 'sold' && (
                <Link
                    href={`/auctions/${auction.id}/edit`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-stone-800"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit listing
                </Link>
            )}
            {isSeller && (
                <OwnerStatusControls
                    auctionId={auction.id}
                    status={auction.status}
                    isPermanent={isPermanent}
                    bidCount={auction.bid_count ?? 0}
                />
            )}
            {(canDelete || canRelist) && (
                <div className="flex flex-wrap justify-end gap-2">
                    {canRelist && (
                        <button
                            onClick={handleRelist}
                            disabled={relistLoading}
                            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:border-black disabled:opacity-50"
                        >
                            {relistLoading ? 'Relisting...' : 'Relist item'}
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${deleteConfirm ? 'border-red-600 bg-red-600 text-white hover:bg-red-700' : 'border-red-300 bg-white text-red-600 hover:bg-red-50'}`}
                    >
                        <Trash2 className="h-4 w-4" />
                        {deleteLoading ? 'Deleting…' : deleteConfirm ? 'Confirm delete' : auction.status === 'sold' ? 'Take down listing' : 'Delete auction'}
                    </button>
                    {deleteConfirm && (
                        <button
                            onClick={() => setDeleteConfirm(false)}
                            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-500 transition-colors hover:text-black"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    const purchasePanel = (
        <div className="flex flex-col gap-4 sm:gap-0">
            {metaPills}
            <div className="sm:mt-[10px]">
                <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-black sm:text-[26px] sm:leading-[1.15]">
                    {auction.title}
                </h1>
                <p className="mt-1 text-[13px] leading-[1.2] text-stone-500">
                    {auction.listing_city ?? 'Greater Accra'}
                </p>
            </div>
            <div className="sm:mt-[14px]">
                <p className="text-[26px] font-extrabold leading-[1.2] tracking-tight text-black sm:text-[30px]">
                    {formatCurrency(auction.current_price)}
                </p>
                <p className="mt-1 text-[12.5px] text-stone-500 sm:mt-[3px] sm:text-[13px] sm:leading-[1.2]">{priceSubline}</p>
            </div>

            {!isPermanent && isActive && (
                <AuctionCountdown endTime={auction.ends_at} onEnd={handleCountdownEnd} />
            )}

            {buyerCtas}

            {isSeller && isActive && !isPermanent && (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                    You cannot bid on your own auction.
                </div>
            )}

            {showBuyerCtas && !isPermanent && (
                <div id="bid-form">
                    <BidForm
                        auctionId={auction.id}
                        currentPrice={auction.current_price}
                        minIncrement={auction.min_increment}
                    />
                </div>
            )}

            {sellerCard}
            {factsRows}
            {manageCard}
        </div>
    );

    return (
        <div className="pb-4">
            {/* Winner Banner */}
            {isWinner && auction.status === 'sold' && (
                <WinnerBanner
                    auctionId={auction.id}
                    auctionTitle={auction.title}
                    amount={auction.current_price}
                    orderId={order?.id}
                />
            )}

            {/* Mobile: full-bleed gallery on top, stacked content below */}
            <div className="sm:hidden">
                <div className="-mx-4">
                    <ListingGallery
                        auctionId={auction.id}
                        title={auction.title}
                        images={images}
                        hasVideo={!!listingVideo}
                        overlayBadge={statusPill}
                        overlayActions={galleryActions}
                    />
                </div>
                <div className="mt-4">{purchasePanel}</div>
            </div>

            {/* Desktop: gallery left, purchase panel right */}
            <div className="hidden sm:flex sm:items-start sm:gap-7">
                <div className="min-w-0 sm:flex-[1.35] sm:sticky sm:top-5 sm:self-start">
                    <ListingGallery
                        auctionId={auction.id}
                        title={auction.title}
                        images={images}
                        hasVideo={!!listingVideo}
                        overlayBadge={statusPill}
                        overlayActions={galleryActions}
                        rounded
                    />
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-6 py-[22px] sm:sticky sm:top-5">
                    {purchasePanel}
                </div>
            </div>

            <div className="mt-8 space-y-6 border-t border-stone-200 pt-8">
                <p className="text-sm text-stone-500">
                    {formatAuctionLocation(auction.listing_city, auction.meetup_area)}
                </p>

                {/* Description */}
                {auction.description && (
                    <div className="rounded-2xl border border-stone-200 bg-white p-5">
                        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-black">
                            Description
                        </h2>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
                            {auction.description}
                        </p>
                    </div>
                )}

                {/* Offer panel for buyers (logged-in or not) */}
                {!isSeller && (
                    <>
                        <div className="flex justify-end">
                            <ShareButton
                                title={`${auction.title} live offers`}
                                url={`/auctions/${auction.id}#offer-panel`}
                            />
                        </div>
                        <OfferPanel
                            auctionId={auction.id}
                            isSeller={false}
                            userId={user?.id}
                            isActive={isActive}
                            listingPrice={isPermanent ? auction.current_price : undefined}
                            buyNowEnabled={buyNowEnabled}
                        />
                    </>
                )}

                {/* Incoming offers panel for the seller — always show so history is visible */}
                {isSeller && (
                    <>
                        <div className="flex justify-end">
                            <ShareButton
                                title={`${auction.title} live offers`}
                                url={`/auctions/${auction.id}#offer-panel`}
                            />
                        </div>
                        <OfferPanel
                            auctionId={auction.id}
                            isSeller={true}
                            userId={user!.id}
                            isActive={isActive}
                        />
                    </>
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
                {!isPermanent && <BidHistory bids={bids} loading={bidsLoading} />}
            </div>

            {/* Sticky purchase bar (mobile buyers) */}
            {showBuyerCtas && (
                <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_18px_rgba(0,0,0,0.06)] sm:hidden">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-extrabold leading-tight text-black">
                            {formatCurrency(auction.current_price)}
                        </p>
                        <p className="text-[11px] text-stone-500">
                            {isPermanent ? 'Fixed price' : 'Current bid'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={scrollToOffer}
                        className="shrink-0 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-300"
                    >
                        Make an offer
                    </button>
                    {canBuyNow && (
                        <button
                            type="button"
                            onClick={clickBuyNow}
                            className="shrink-0 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-stone-800"
                        >
                            Buy now
                        </button>
                    )}
                    {!isPermanent && (
                        <button
                            type="button"
                            onClick={scrollToBid}
                            className="shrink-0 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-stone-800"
                        >
                            Bid
                        </button>
                    )}
                </div>
            )}

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

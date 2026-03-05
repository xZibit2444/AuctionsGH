'use client';

import { useCallback, useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { useBids } from '@/hooks/useBids';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';
import { useAuth } from '@/hooks/useAuth';
import { useSavedAuctions } from '@/hooks/useSavedAuctions';
import { formatCurrency, formatDisplayName } from '@/lib/utils';
import { CONDITION_LABELS } from '@/lib/constants';
import AuctionCountdown from './AuctionCountdown';
import AuctionStatusBadge from './AuctionStatusBadge';
import BidForm from '@/components/bidding/BidForm';
import BidHistory from '@/components/bidding/BidHistory';
import WinnerBanner from '@/components/bidding/WinnerBanner';
import Avatar from '@/components/ui/Avatar';
import { Heart, CheckCircle2 } from 'lucide-react';
import type { BidWithBidder } from '@/types/bid';
import { useRouter } from 'next/navigation';
import type { AuctionStatus } from '@/types/database';
import { finalizeAuctionAction } from '@/app/actions/finalizeAuction';

interface AuctionDetailProps {
    auctionId: string;
}

export default function AuctionDetail({ auctionId }: AuctionDetailProps) {
    const { auction, loading, setAuction } = useAuction(auctionId);
    const { bids, setBids, loading: bidsLoading } = useBids(auctionId);
    const { user } = useAuth();
    const { savedIds, toggleSave } = useSavedAuctions();
    const [selectedImage, setSelectedImage] = useState(0);
    const [savePending, setSavePending] = useState(false);
    const [showCongrats, setShowCongrats] = useState(false);
    const router = useRouter();

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
            if (auction) {
                setAuction({
                    ...auction,
                    current_price: bid.amount,
                    bid_count: auction.bid_count + 1,
                });
            }
        },
        [auction, setAuction, setBids]
    );

    const handleAuctionUpdate = useCallback(
        (payload: Record<string, unknown>) => {
            if (auction) {
                const newStatus = payload.status as AuctionStatus;
                const newWinnerId = payload.winner_id as string | null;

                if (auction.status === 'active' && newStatus === 'sold' && newWinnerId === user?.id) {
                    setShowCongrats(true);
                }

                setAuction({
                    ...auction,
                    status: newStatus,
                    winner_id: newWinnerId,
                });
            }
        },
        [auction, setAuction, user?.id]
    );

    useRealtimeBids({
        auctionId,
        onNewBid: handleNewBid,
        onAuctionUpdate: handleAuctionUpdate,
    });

    const handleCountdownEnd = useCallback(async () => {
        if (auction?.status === 'active') {
            const highestBidderId = bids[0]?.bidder_id;

            // Fire the server action to instantly claim the win & notifications
            await finalizeAuctionAction(auctionId);

            // Instantly finalize on the client side UI
            if (highestBidderId === user?.id) {
                setShowCongrats(true);
            }
            // Transition status to hide the bid form instantly
            setAuction((prev) => prev ? { ...prev, status: highestBidderId ? 'sold' : 'ended' } : prev);
        }
    }, [auction, bids, user?.id, setAuction, auctionId]);

    if (loading || !auction) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    const images = auction.auction_images?.sort((a, b) => a.position - b.position) ?? [];
    const isWinner = auction.winner_id === user?.id;
    const isSeller = auction.seller_id === user?.id;
    const orderRaw = (auction as any).orders;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;

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
                    <div className="flex items-center gap-3">
                        <Avatar
                            name={formatDisplayName(auction.profiles?.username ?? 'Seller')}
                            size="sm"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDisplayName(auction.profiles?.username)}
                                {auction.profiles?.is_verified && (
                                    <span className="ml-1 text-emerald-600">✓</span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500">{auction.profiles?.location}</p>
                        </div>
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {[
                            { label: 'Brand', value: auction.brand },
                            { label: 'Model', value: auction.model },
                            { label: 'Condition', value: CONDITION_LABELS[auction.condition] },
                            { label: 'Storage', value: auction.storage_gb ? `${auction.storage_gb} GB` : '—' },
                            { label: 'RAM', value: auction.ram_gb ? `${auction.ram_gb} GB` : '—' },
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

                    {isSeller && auction.status === 'active' && (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                            You cannot bid on your own auction.
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

                    {/* Bid History */}
                    <BidHistory bids={bids} loading={bidsLoading} />
                </div>
            </div>

            {/* Congrats Modal Overlay */}
            {showCongrats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white max-w-sm w-full p-8 text-center shadow-2xl animate-in zoom-in-95 duration-500 rounded-sm">
                        <div className="mx-auto w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl font-black text-black tracking-tight mb-2">You Won!</h2>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            Congratulations! Your bid was the highest. You now have <span className="font-bold text-black">30 minutes</span> to complete checkout and secure the item.
                        </p>
                        <button
                            onClick={() => router.push(`/checkout/${auction.id}`)}
                            className="w-full flex justify-center py-4 bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors uppercase tracking-widest mb-3"
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

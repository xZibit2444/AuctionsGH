'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuctions } from '@/hooks/useAuctions';
import { getPrimaryDelivery } from '@/lib/delivery';
import { getListingType, getListingTypeLabel } from '@/lib/listings';
import { formatCurrency } from '@/lib/utils';
import Skeleton from '@/components/ui/Skeleton';
import { ArrowUpRight, Trash2, MessageCircle } from 'lucide-react';
import { markShippedAction } from '@/app/actions/delivery';
import { deleteAuctionAction } from '@/app/actions/deleteAuction';
import { relistAuctionAction } from '@/app/actions/relistAuction';
import { setListingStatusAction, type ListingStatusChange } from '@/app/actions/updateListing';
import type { Auction } from '@/types/auction';
import type { AuctionStatus } from '@/types/database';
import { useRouter } from 'next/navigation';

const chip = 'inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-colors';
const chipNeutral = chip + ' bg-gray-100 text-black hover:bg-gray-200 disabled:opacity-50';
const chipOrder = chip + ' bg-emerald-600 text-white hover:bg-emerald-700';
const chipChat = chip + ' bg-blue-50 text-blue-700 hover:bg-blue-100';
const chipDark = chip + ' bg-black text-white hover:bg-gray-900 disabled:opacity-50';
const chipDanger = chip + ' bg-red-50 text-red-600 hover:bg-red-100';
const chipDangerSolid = chip + ' bg-red-600 text-white disabled:opacity-50';
const chipMuted = chip + ' bg-gray-50 text-gray-500';

function StatusPill({ status }: { status: string }) {
    const st = (status || '').toLowerCase();
    const styles: Record<string, string> = {
        active: 'text-emerald-700 bg-emerald-50',
        live: 'text-emerald-700 bg-emerald-50',
        sold: 'text-white bg-black',
        ended: 'text-gray-500 bg-gray-100',
        draft: 'text-gray-500 bg-gray-100',
        paused: 'text-gray-500 bg-gray-100',
        won: 'text-black bg-amber-400',
    };
    const label = st === 'active' ? 'LIVE' : st.toUpperCase();
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[st] ?? 'text-gray-500 bg-gray-100'}`}>
            {label}
        </span>
    );
}

type ListingDelivery = {
    status: string;
    delivered_at?: string | null;
    created_at?: string | null;
};

type ListingOrder = {
    id: string;
    status: string;
    deliveries?: ListingDelivery[] | ListingDelivery | null;
};

type ListingAuction = Auction & {
    orders?: ListingOrder[] | ListingOrder | null;
    auction_offers?: { status: string }[] | null;
};

interface ListingTableProps {
    adminMode?: boolean;
    sellerId?: string;
    status?: AuctionStatus | 'all' | 'visible';
}

function getAuctionOrder(auction: ListingAuction) {
    const orderRaw = auction.orders;
    return Array.isArray(orderRaw) ? orderRaw[0] ?? null : orderRaw ?? null;
}

function isCompletedDeal(order: ListingOrder | null) {
    const delivery = order ? getPrimaryDelivery(order.deliveries) : null;
    return order?.status === 'completed'
        || order?.status === 'pin_verified'
        || delivery?.status === 'completed'
        || delivery?.status === 'delivered';
}

function hasActiveAcceptedOffer(auction: ListingAuction, order: ListingOrder | null) {
    const acceptedOfferExists = (auction.auction_offers ?? []).some((offer) => offer.status === 'accepted');
    return acceptedOfferExists && !isCompletedDeal(order);
}

export default function ListingTable({
    adminMode = false,
    sellerId,
    status = 'all',
}: ListingTableProps) {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [markingId, setMarkingId] = useState<string | null>(null);
    const [sentOrderIds, setSentOrderIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [relistingId, setRelistingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
    const [statusOverrides, setStatusOverrides] = useState<Record<string, AuctionStatus>>({});
    const [renderTimestamp] = useState(() => Date.now());

    const effectiveStatus = adminMode ? (status === 'all' ? 'active' : status) : status;
    const effectiveSellerId = adminMode ? sellerId : (sellerId ?? user?.id);

    const { auctions, loading } = useAuctions({
        sellerId: effectiveSellerId,
        status: effectiveStatus,
        orderBy: 'created_at',
        ascending: false,
        limit: 50,
        includeOrders: !adminMode,
    });

    const isSuperAdmin = profile?.is_super_admin === true;

    const handleDelete = async (auctionId: string) => {
        setDeleteError(null);
        setDeletingId(auctionId);
        const result = await deleteAuctionAction(auctionId);
        if (result.success) {
            setDeletedIds((prev) => new Set(prev).add(auctionId));
        } else {
            setDeleteError(result.error ?? 'Could not delete this listing.');
        }
        setDeletingId(null);
        setDeleteConfirmId(null);
    };

    const handleStatusChange = async (auctionId: string, change: ListingStatusChange) => {
        setDeleteError(null);
        setStatusBusyId(auctionId);
        const result = await setListingStatusAction(auctionId, change);
        if (result.success) {
            const next: AuctionStatus = change === 'pause' ? 'draft' : change === 'resume' ? 'active' : 'ended';
            setStatusOverrides((prev) => ({ ...prev, [auctionId]: next }));
        } else {
            setDeleteError(result.error ?? 'Could not update this listing.');
        }
        setStatusBusyId(null);
    };

    const handleMarkSent = async (orderId: string) => {
        setMarkingId(orderId);
        const result = await markShippedAction(orderId);
        if (result.success) {
            setSentOrderIds((prev) => new Set(prev).add(orderId));
        }
        setMarkingId(null);
    };

    const handleRelist = async (auctionId: string) => {
        setDeleteError(null);
        setRelistingId(auctionId);
        const result = await relistAuctionAction(auctionId);
        setRelistingId(null);

        if (!result.success || !result.auctionId) {
            setDeleteError(result.error ?? 'Could not relist this item.');
            return;
        }

        router.push(`/auctions/${result.auctionId}`);
        router.refresh();
    };

    const visibleAuctions = (auctions as ListingAuction[]).filter((auction) => !deletedIds.has(auction.id));

    if (loading) {
        return (
            <div className="divide-y divide-gray-100">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4">
                        <Skeleton className="h-5 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (visibleAuctions.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <p className="text-sm text-gray-400 mb-4">
                    {adminMode ? 'No live listings found.' : 'You haven&apos;t created any listings yet.'}
                </p>
                {!adminMode && (
                    <Link
                        href="/auctions/create"
                        className="inline-flex items-center gap-1 text-sm font-bold text-black underline underline-offset-4"
                    >
                        Create your first listing
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            {deleteError && (
                <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                    {deleteError}
                </div>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing</th>
                        <th className="text-left py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                        <th className="text-right py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                        <th className="text-right py-3 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Bids</th>
                        <th className="py-3 px-5 hidden sm:table-cell" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {visibleAuctions.map((rawAuction) => {
                        const auction = statusOverrides[rawAuction.id]
                            ? { ...rawAuction, status: statusOverrides[rawAuction.id] }
                            : rawAuction;
                        const listingType = getListingType(auction);
                        const order = getAuctionOrder(auction);
                        const delivery = order ? getPrimaryDelivery(order.deliveries) : null;
                        const isSentInDb = delivery?.status === 'sent' || delivery?.status === 'delivered' || delivery?.status === 'completed';
                        const endsAt = auction.ends_at ? new Date(auction.ends_at).getTime() : 0;
                        const isExpired = endsAt > 0 && (renderTimestamp - endsAt > 30 * 60 * 1000);
                        const activeAcceptedOffer = hasActiveAcceptedOffer(auction, order);
                        const canSellerDelete = (auction.status !== 'sold' || (auction.status === 'sold' && isCompletedDeal(order)))
                            && !activeAcceptedOffer;
                        const canRelist = !adminMode
                            && (auction.status === 'ended' || (auction.status === 'sold' && isCompletedDeal(order)))
                            && !activeAcceptedOffer;
                        const canDelete = adminMode
                            ? isSuperAdmin
                            : (isSuperAdmin || canSellerDelete);
                        const deleteTitle = adminMode
                            ? 'Remove listing'
                            : (auction.status === 'sold' ? 'Take down listing' : 'Delete listing');
                        const deleteLabel = adminMode
                            ? 'Remove'
                            : (auction.status === 'sold' ? 'Take down' : 'Delete');

                        return (
                            <tr
                                key={auction.id}
                                className="hover:bg-gray-50 transition-colors group"
                            >
                                <td className="py-4 px-5">
                                    <div className="flex items-start gap-3">
                                        {(() => {
                                            const imgs = (auction as ListingAuction & { auction_images?: { url: string }[] }).auction_images;
                                            const imgUrl = Array.isArray(imgs) && imgs.length > 0 ? imgs[0]?.url : null;
                                            return imgUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={imgUrl} alt="" className="h-11 w-11 rounded-xl object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="h-11 w-11 rounded-xl flex-shrink-0 flex items-center justify-center text-amber-300 font-black text-lg" style={{ background: 'linear-gradient(135deg,#1E1A14,#3A332A)' }}>
                                                    {(auction.title || '?').charAt(0).toUpperCase()}
                                                </div>
                                            );
                                        })()}
                                        <div className="min-w-0">
                                    <Link
                                        href={`/auctions/${auction.id}`}
                                        className="font-semibold text-black hover:underline underline-offset-2 line-clamp-1"
                                    >
                                        {auction.title}
                                    </Link>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="inline-flex border border-gray-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                                            {getListingTypeLabel(listingType)}
                                        </span>
                                    </div>
                                    {adminMode && (
                                        <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                            Seller {auction.seller_id.slice(0, 8)}
                                        </p>
                                    )}
                                    <span className="sm:hidden block mt-1.5">
                                        <StatusPill status={auction.status} />
                                    </span>
                                    <div className="sm:hidden mt-3 flex flex-wrap items-center gap-2">
                                        <Link
                                            href={`/auctions/${auction.id}`}
                                            className={chipNeutral}
                                        >
                                            View
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                        {!adminMode && order && (
                                            <>
                                                <Link
                                                    href={`/orders/${order.id}`}
                                                    className={chipOrder}
                                                >
                                                    Order
                                                </Link>
                                                <Link
                                                    href={`/orders/${order.id}#chat`}
                                                    className={chipChat}
                                                >
                                                    <MessageCircle className="w-3 h-3" />
                                                    Chat
                                                </Link>
                                                {sentOrderIds.has(order.id) || isSentInDb ? (
                                                    <span className={chipChat}>
                                                        Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => void handleMarkSent(order.id)}
                                                        disabled={markingId === order.id}
                                                        className={chipDark}
                                                    >
                                                        {markingId === order.id ? 'Saving...' : 'Mark Sent'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {canDelete && (
                                            deleteConfirmId === auction.id ? (
                                                <>
                                                    <button
                                                        onClick={() => void handleDelete(auction.id)}
                                                        disabled={deletingId === auction.id}
                                                        className={chipDangerSolid}
                                                    >
                                                        {deletingId === auction.id ? 'Deleting...' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className={chipMuted}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirmId(auction.id)}
                                                    className={chipDanger}
                                                    title={deleteTitle}
                                                    aria-label={deleteTitle}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    {deleteLabel}
                                                </button>
                                            )
                                        )}
                                        {!adminMode && !activeAcceptedOffer && auction.status !== 'sold' && (
                                            <>
                                                <Link
                                                    href={`/auctions/${auction.id}/edit`}
                                                    className={chipNeutral}
                                                >
                                                    Edit
                                                </Link>
                                                <Link
                                                    href={`/auctions/create?from=${auction.id}`}
                                                    className={chipNeutral}
                                                >
                                                    Duplicate
                                                </Link>
                                                {listingType === 'permanent' && (auction.bid_count ?? 0) === 0 && (
                                                    <>
                                                        {auction.status === 'active' && (
                                                            <>
                                                                <button
                                                                    onClick={() => void handleStatusChange(auction.id, 'pause')}
                                                                    disabled={statusBusyId === auction.id}
                                                                    className={chipNeutral}
                                                                >
                                                                    Pause
                                                                </button>
                                                                <button
                                                                    onClick={() => void handleStatusChange(auction.id, 'sold_elsewhere')}
                                                                    disabled={statusBusyId === auction.id}
                                                                    className={chipNeutral}
                                                                >
                                                                    Mark sold
                                                                </button>
                                                            </>
                                                        )}
                                                        {(auction.status === 'draft' || auction.status === 'ended') && (
                                                            <button
                                                                    onClick={() => void handleStatusChange(auction.id, 'resume')}
                                                                    disabled={statusBusyId === auction.id}
                                                                    className={chipNeutral}
                                                                >
                                                                    Resume
                                                                </button>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
                                        {canRelist && (
                                            <button
                                                onClick={() => void handleRelist(auction.id)}
                                                disabled={relistingId === auction.id}
                                                className={chipNeutral}
                                            >
                                                {relistingId === auction.id ? 'Relisting...' : 'Relist'}
                                            </button>
                                        )}
                                    </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-5 hidden sm:table-cell">
                                    {!adminMode && order ? (
                                        delivery?.status === 'completed' ? (
                                            <StatusPill status={auction.status} />
                                        ) : (
                                            <span className="inline-flex items-center text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                                                PENDING
                                            </span>
                                        )
                                    ) : (
                                        <StatusPill status={auction.status} />
                                    )}
                                </td>
                                <td className="py-4 px-5 text-right font-black text-black font-mono">
                                    {formatCurrency(auction.current_price)}
                                </td>
                                <td className="py-4 px-5 text-right text-gray-500 hidden sm:table-cell font-mono">
                                    {auction.bid_count}
                                </td>
                                <td className="py-4 px-5 hidden sm:table-cell text-right">
                                    <div className="flex justify-end items-center gap-4">
                                        {!adminMode && (() => {
                                            if (order) {
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/orders/${order.id}`}
                                                            className={chipOrder}
                                                        >
                                                            Order
                                                        </Link>
                                                        <Link
                                                            href={`/orders/${order.id}#chat`}
                                                            className={chipChat}
                                                            title="Open chat"
                                                        >
                                                            <MessageCircle className="w-3 h-3" />
                                                            Chat
                                                        </Link>
                                                        {sentOrderIds.has(order.id) || isSentInDb ? (
                                                            <span className={chipChat}>
                                                                Sent
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => void handleMarkSent(order.id)}
                                                                disabled={markingId === order.id}
                                                                className={chipDark}
                                                            >
                                                                {markingId === order.id ? 'Saving...' : 'Mark Sent'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            if (auction.status === 'sold' && isExpired) {
                                                return (
                                                    <span className={chipDanger}>
                                                        VOID
                                                    </span>
                                                );
                                            }

                                            return null;
                                        })()}
                                        <Link href={`/auctions/${auction.id}`}>
                                            <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-black transition-colors" />
                                        </Link>
                                        {!adminMode && !activeAcceptedOffer && auction.status !== 'sold' && (
                                            <>
                                                <Link
                                                    href={`/auctions/${auction.id}/edit`}
                                                    className={chipNeutral}
                                                >
                                                    Edit
                                                </Link>
                                                <Link
                                                    href={`/auctions/create?from=${auction.id}`}
                                                    className={chipNeutral}
                                                >
                                                    Duplicate
                                                </Link>
                                                {listingType === 'permanent' && (auction.bid_count ?? 0) === 0 && (
                                                    <>
                                                        {auction.status === 'active' && (
                                                            <>
                                                                <button
                                                                    onClick={() => void handleStatusChange(auction.id, 'pause')}
                                                                    disabled={statusBusyId === auction.id}
                                                                    className={chipNeutral}
                                                                >
                                                                    Pause
                                                                </button>
                                                                <button
                                                                    onClick={() => void handleStatusChange(auction.id, 'sold_elsewhere')}
                                                                    disabled={statusBusyId === auction.id}
                                                                    className={chipNeutral}
                                                                >
                                                                    Mark sold
                                                                </button>
                                                            </>
                                                        )}
                                                        {(auction.status === 'draft' || auction.status === 'ended') && (
                                                            <button
                                                                    onClick={() => void handleStatusChange(auction.id, 'resume')}
                                                                    disabled={statusBusyId === auction.id}
                                                                    className={chipNeutral}
                                                                >
                                                                    Resume
                                                                </button>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
                                        {canRelist && (
                                            <button
                                                onClick={() => void handleRelist(auction.id)}
                                                disabled={relistingId === auction.id}
                                                className={chipNeutral}
                                            >
                                                {relistingId === auction.id ? 'Relisting...' : 'Relist'}
                                            </button>
                                        )}
                                        {canDelete && (
                                            deleteConfirmId === auction.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => void handleDelete(auction.id)}
                                                        disabled={deletingId === auction.id}
                                                        className="text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 px-2 py-1 transition-colors disabled:opacity-50"
                                                    >
                                                        {deletingId === auction.id ? 'Deleting...' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black px-2 py-1 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirmId(auction.id)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                    title={deleteTitle}
                                                    aria-label={deleteTitle}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuctions } from '@/hooks/useAuctions';
import { getPrimaryDelivery } from '@/lib/delivery';
import { formatCurrency } from '@/lib/utils';
import AuctionStatusBadge from '@/components/auction/AuctionStatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import { ArrowUpRight, Trash2, MessageCircle } from 'lucide-react';
import { markShippedAction } from '@/app/actions/delivery';
import { deleteAuctionAction } from '@/app/actions/deleteAuction';
import type { Auction } from '@/types/auction';
import type { AuctionStatus } from '@/types/database';

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

export default function ListingTable({
    adminMode = false,
    sellerId,
    status = 'all',
}: ListingTableProps) {
    const { user, profile } = useAuth();
    const [markingId, setMarkingId] = useState<string | null>(null);
    const [sentOrderIds, setSentOrderIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
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
        setDeletingId(auctionId);
        const result = await deleteAuctionAction(auctionId);
        if (result.success) {
            setDeletedIds((prev) => new Set(prev).add(auctionId));
        }
        setDeletingId(null);
        setDeleteConfirmId(null);
    };

    const handleMarkSent = async (orderId: string) => {
        setMarkingId(orderId);
        const result = await markShippedAction(orderId);
        if (result.success) {
            setSentOrderIds((prev) => new Set(prev).add(orderId));
        }
        setMarkingId(null);
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
                    {visibleAuctions.map((auction) => {
                        const order = getAuctionOrder(auction);
                        const delivery = order ? getPrimaryDelivery(order.deliveries) : null;
                        const isSentInDb = delivery?.status === 'sent' || delivery?.status === 'delivered' || delivery?.status === 'completed';
                        const endsAt = auction.ends_at ? new Date(auction.ends_at).getTime() : 0;
                        const isExpired = endsAt > 0 && (renderTimestamp - endsAt > 30 * 60 * 1000);
                        const canSellerDelete = ((auction.status !== 'sold' && (auction.bid_count ?? 0) === 0)
                            || (auction.status === 'sold' && isCompletedDeal(order)));
                        const canDelete = adminMode
                            ? isSuperAdmin && auction.status === 'active'
                            : canSellerDelete;
                        const deleteTitle = adminMode
                            ? 'Remove live listing'
                            : (auction.status === 'sold' ? 'Take down listing' : 'Delete listing');
                        const deleteLabel = adminMode
                            ? 'Remove live'
                            : (auction.status === 'sold' ? 'Take down' : 'Delete');

                        return (
                            <tr
                                key={auction.id}
                                className="hover:bg-gray-50 transition-colors group"
                            >
                                <td className="py-4 px-5">
                                    <Link
                                        href={`/auctions/${auction.id}`}
                                        className="font-semibold text-black hover:underline underline-offset-2 line-clamp-1"
                                    >
                                        {auction.title}
                                    </Link>
                                    {adminMode && (
                                        <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                            Seller {auction.seller_id.slice(0, 8)}
                                        </p>
                                    )}
                                    <span className="sm:hidden block mt-1.5">
                                        <AuctionStatusBadge status={auction.status} />
                                    </span>
                                    <div className="sm:hidden mt-3 flex flex-wrap items-center gap-2">
                                        <Link
                                            href={`/auctions/${auction.id}`}
                                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black border border-gray-200 px-2 py-1"
                                        >
                                            View
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                        {!adminMode && order && (
                                            <>
                                                <Link
                                                    href={`/orders/${order.id}`}
                                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1"
                                                >
                                                    Order
                                                </Link>
                                                <Link
                                                    href={`/orders/${order.id}#chat`}
                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1"
                                                >
                                                    <MessageCircle className="w-3 h-3" />
                                                    Chat
                                                </Link>
                                                {sentOrderIds.has(order.id) || isSentInDb ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-1">
                                                        Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => void handleMarkSent(order.id)}
                                                        disabled={markingId === order.id}
                                                        className="text-[10px] font-black uppercase tracking-widest text-white bg-black px-2 py-1 disabled:opacity-50"
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
                                                        className="text-[10px] font-black uppercase tracking-widest text-white bg-red-600 px-2 py-1 disabled:opacity-50"
                                                    >
                                                        {deletingId === auction.id ? 'Deleting...' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-200 px-2 py-1"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirmId(auction.id)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-200 px-2 py-1"
                                                    title={deleteTitle}
                                                    aria-label={deleteTitle}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    {deleteLabel}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-5 hidden sm:table-cell">
                                    {!adminMode && order ? (
                                        delivery?.status === 'completed' ? (
                                            <AuctionStatusBadge status={auction.status} />
                                        ) : (
                                            <span className="inline-block text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-amber-100 text-amber-700">
                                                PENDING
                                            </span>
                                        )
                                    ) : (
                                        <AuctionStatusBadge status={auction.status} />
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
                                                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors px-2 py-1"
                                                        >
                                                            Order
                                                        </Link>
                                                        <Link
                                                            href={`/orders/${order.id}#chat`}
                                                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-2 py-1"
                                                            title="Open chat"
                                                        >
                                                            <MessageCircle className="w-3 h-3" />
                                                            Chat
                                                        </Link>
                                                        {sentOrderIds.has(order.id) || isSentInDb ? (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-1">
                                                                Sent
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => void handleMarkSent(order.id)}
                                                                disabled={markingId === order.id}
                                                                className="text-[10px] font-black uppercase tracking-widest text-white bg-black hover:bg-gray-900 transition-colors px-2 py-1 disabled:opacity-50"
                                                            >
                                                                {markingId === order.id ? 'Saving...' : 'Mark Sent'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            if (auction.status === 'sold' && isExpired) {
                                                return (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1">
                                                        VOID
                                                    </span>
                                                );
                                            }

                                            return null;
                                        })()}
                                        <Link href={`/auctions/${auction.id}`}>
                                            <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-black transition-colors" />
                                        </Link>
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

'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
    Search, Ban, Clock, Pencil, Trash2, RefreshCw, TimerReset,
    ChevronDown, ChevronUp, Check, X, AlertTriangle, Package,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
    adminUnpublishAuction,
    adminForceEndAuction,
    adminExtendAuction,
    adminEditAuctionTitle,
    adminReactivateAuction,
} from '@/app/actions/adminAuctions';
import { deleteAuctionAction } from '@/app/actions/deleteAuction';
import type { AdminAuctionRow } from '@/app/admin/auctions/page';

const STATUS_FILTERS = ['all', 'active', 'sold', 'ended', 'cancelled', 'draft'] as const;

function statusTone(status: string) {
    if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'sold') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'ended') return 'bg-gray-100 text-gray-600 border-gray-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-600 border-red-200';
    if (status === 'draft') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-50 text-gray-500 border-gray-200';
}

function ConfirmButton({
    label, icon: Icon, tone, onConfirm, disabled,
}: {
    label: string;
    icon: React.ElementType;
    tone: 'red' | 'amber' | 'black' | 'green';
    onConfirm: () => void;
    disabled?: boolean;
}) {
    const [asking, setAsking] = useState(false);
    const toneClasses = {
        red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
        black: 'border-gray-800 bg-black text-white hover:bg-gray-800',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    }[tone];

    if (asking) {
        return (
            <span className="inline-flex items-center gap-1">
                <span className="text-[10px] font-black text-gray-500 mr-1">Sure?</span>
                <button
                    type="button"
                    onClick={() => { setAsking(false); onConfirm(); }}
                    className="inline-flex items-center gap-1 border border-red-300 bg-red-600 text-white px-2 py-1 text-[10px] font-black uppercase"
                >
                    <Check className="h-3 w-3" /> Yes
                </button>
                <button
                    type="button"
                    onClick={() => setAsking(false)}
                    className="inline-flex items-center gap-1 border border-gray-200 bg-white text-gray-600 px-2 py-1 text-[10px] font-black uppercase"
                >
                    <X className="h-3 w-3" /> No
                </button>
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setAsking(true)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 ${toneClasses}`}
        >
            <Icon className="h-3 w-3" />
            {label}
        </button>
    );
}

function AuctionRow({
    auction,
    onMutated,
}: {
    auction: AdminAuctionRow;
    onMutated: (id: string, updates: Partial<AdminAuctionRow> | null) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(auction.title);
    const [extendHours, setExtendHours] = useState(24);

    const act = (fn: () => Promise<{ success: boolean; error?: string }>, successMsg: string, updates?: Partial<AdminAuctionRow> | null) => {
        setFeedback(null);
        startTransition(async () => {
            const res = await fn();
            if (res.success) {
                setFeedback({ ok: true, msg: successMsg });
                onMutated(auction.id, updates ?? null);
            } else {
                setFeedback({ ok: false, msg: res.error ?? 'Failed' });
            }
        });
    };

    const sellerName = auction.seller?.full_name || auction.seller?.username || 'Unknown seller';
    const endsAt = new Date(auction.ends_at);
    const isExpired = endsAt < new Date();
    const imageUrl = auction.auction_images?.[0]?.url;

    return (
        <section className="border border-gray-200 bg-white overflow-hidden">
            {/* Row header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 shrink-0 bg-gray-100 border border-gray-200 overflow-hidden">
                        {imageUrl
                            ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                            : <Package className="w-5 h-5 text-gray-300 m-auto mt-3.5" />
                        }
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className={`inline-flex items-center border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${statusTone(auction.status)}`}>
                                {auction.status}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">{auction.id.split('-')[0].toUpperCase()}</span>
                        </div>
                        <p className="font-bold text-black text-sm leading-snug line-clamp-1">{auction.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {sellerName} · {auction.listing_city} · {auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="text-right">
                        <p className="font-mono font-black text-sm text-black">{formatCurrency(auction.current_price)}</p>
                        <p className="text-[10px] text-gray-400">
                            {isExpired ? <span className="text-red-500">Expired</span> : `Ends ${endsAt.toLocaleDateString('en-GH')}`}
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <Link
                            href={`/auctions/${auction.id}`}
                            target="_blank"
                            className="inline-flex items-center border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-black hover:text-black transition-colors"
                        >
                            View
                        </Link>
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-black transition-colors"
                        >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            Actions
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded action panel */}
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                    {feedback && (
                        <div className={`flex items-center gap-2 px-3 py-2 border text-xs font-semibold ${feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {feedback.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {feedback.msg}
                        </div>
                    )}

                    {/* Edit title */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Edit Title</p>
                        {editingTitle ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    className="flex-1 border border-gray-200 px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black"
                                />
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => act(
                                        () => adminEditAuctionTitle(auction.id, titleDraft),
                                        'Title updated',
                                        { title: titleDraft }
                                    )}
                                    className="inline-flex items-center gap-1 bg-black text-white px-3 py-1.5 text-xs font-black disabled:opacity-50"
                                >
                                    <Check className="h-3 w-3" /> Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingTitle(false); setTitleDraft(auction.title); }}
                                    className="inline-flex items-center gap-1 border border-gray-200 bg-white text-gray-600 px-3 py-1.5 text-xs font-black"
                                >
                                    <X className="h-3 w-3" /> Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setEditingTitle(true)}
                                className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-black hover:text-black transition-colors"
                            >
                                <Pencil className="h-3 w-3" /> Edit Title
                            </button>
                        )}
                    </div>

                    {/* Status actions */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Status Actions</p>
                        <div className="flex flex-wrap gap-2">
                            {auction.status === 'active' && (
                                <>
                                    <ConfirmButton
                                        label="Unpublish"
                                        icon={Ban}
                                        tone="red"
                                        disabled={isPending}
                                        onConfirm={() => act(
                                            () => adminUnpublishAuction(auction.id),
                                            'Listing unpublished',
                                            { status: 'cancelled' }
                                        )}
                                    />
                                    <ConfirmButton
                                        label="Force End Now"
                                        icon={Clock}
                                        tone="amber"
                                        disabled={isPending}
                                        onConfirm={() => act(
                                            () => adminForceEndAuction(auction.id),
                                            'Auction force-ended',
                                            { status: 'ended' }
                                        )}
                                    />
                                </>
                            )}
                            {(auction.status === 'ended' || auction.status === 'cancelled') && (
                                <ConfirmButton
                                    label="Reactivate (+24h)"
                                    icon={RefreshCw}
                                    tone="green"
                                    disabled={isPending}
                                    onConfirm={() => act(
                                        () => adminReactivateAuction(auction.id, 24),
                                        'Listing reactivated for 24h',
                                        { status: 'active' }
                                    )}
                                />
                            )}
                            <ConfirmButton
                                label="Delete Listing"
                                icon={Trash2}
                                tone="red"
                                disabled={isPending}
                                onConfirm={() => act(
                                    () => deleteAuctionAction(auction.id),
                                    'Listing deleted',
                                    null
                                )}
                            />
                        </div>
                    </div>

                    {/* Extend time — only for active */}
                    {auction.status === 'active' && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Extend End Time</p>
                            <div className="flex items-center gap-2">
                                <select
                                    value={extendHours}
                                    onChange={(e) => setExtendHours(Number(e.target.value))}
                                    className="border border-gray-200 px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black bg-white"
                                >
                                    {[1, 3, 6, 12, 24, 48, 72].map((h) => (
                                        <option key={h} value={h}>+{h}h</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => act(
                                        () => adminExtendAuction(auction.id, extendHours),
                                        `End time extended by ${extendHours}h`
                                    )}
                                    className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-black hover:text-black transition-colors disabled:opacity-50"
                                >
                                    <TimerReset className="h-3 w-3" /> Apply Extension
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Currently ends: {endsAt.toLocaleString('en-GH')}
                            </p>
                        </div>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-200">
                        {[
                            ['Starting Price', formatCurrency(auction.starting_price)],
                            ['Current Price', formatCurrency(auction.current_price)],
                            ['Condition', auction.condition],
                            ['Bids', String(auction.bid_count)],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                <p className="text-sm font-bold text-black mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export default function AdminAuctionsClient({
    auctions,
}: {
    auctions: AdminAuctionRow[];
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [rows, setRows] = useState<AdminAuctionRow[]>(auctions);

    const onMutated = (id: string, updates: Partial<AdminAuctionRow> | null) => {
        if (updates === null) {
            setRows((prev) => prev.filter((a) => a.id !== id));
        } else {
            setRows((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((a) => {
            const matchStatus = statusFilter === 'all' || a.status === statusFilter;
            const matchQuery = !q
                || a.title.toLowerCase().includes(q)
                || a.id.toLowerCase().includes(q)
                || a.id.split('-')[0].toLowerCase().includes(q)
                || (a.seller?.full_name ?? '').toLowerCase().includes(q)
                || (a.seller?.username ?? '').toLowerCase().includes(q)
                || a.listing_city.toLowerCase().includes(q);
            return matchStatus && matchQuery;
        });
    }, [rows, query, statusFilter]);

    return (
        <div>
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by title, ID, seller, city..."
                        className="w-full border border-gray-200 pl-9 pr-4 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setStatusFilter(s)}
                            className={`border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${statusFilter === s ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-500 hover:text-black hover:border-gray-400'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 font-semibold">{filtered.length} listing{filtered.length !== 1 ? 's' : ''} shown</p>

            {filtered.length === 0 ? (
                <div className="border border-gray-200 bg-white p-12 text-center">
                    <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-black text-black">No listings found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((auction) => (
                        <AuctionRow
                            key={auction.id}
                            auction={auction}
                            onMutated={onMutated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

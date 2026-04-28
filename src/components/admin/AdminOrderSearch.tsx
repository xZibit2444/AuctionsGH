'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, Loader2, AlertTriangle, X, MessageSquare, User, Package, Receipt } from 'lucide-react';
import { adminSearchOrderAction, type AdminOrderSearchResult } from '@/app/actions/adminSearchOrder';
import { formatCurrency } from '@/lib/utils';

function statusTone(status: string) {
    if (status === 'completed' || status === 'pin_verified') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status.startsWith('cancelled') || status === 'ghosted') return 'bg-red-50 text-red-700 border-red-200';
    if (status.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'sent' || status === 'delivered') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function AdminOrderSearch() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<AdminOrderSearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSearch = () => {
        if (!query.trim()) return;
        setResult(null);
        setError(null);
        startTransition(async () => {
            const res = await adminSearchOrderAction(query);
            if (res.error) setError(res.error);
            else setResult(res.result);
        });
    };

    const clear = () => {
        setQuery('');
        setResult(null);
        setError(null);
    };

    return (
        <div className="mb-8">
            {/* Search bar */}
            <div className="border border-gray-200 bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                    Search Order by Number
                </p>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Order number e.g. 91F8B7CD or full UUID"
                            className="w-full border border-gray-200 pl-9 pr-4 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black font-mono"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isPending || !query.trim()}
                        className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        {isPending ? 'Searching...' : 'Search'}
                    </button>
                    {(result || error) && (
                        <button
                            type="button"
                            onClick={clear}
                            className="inline-flex items-center gap-1 border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-500 hover:border-black hover:text-black transition-colors"
                        >
                            <X className="h-4 w-4" />
                            Clear
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mt-3 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* Result */}
            {result && (
                <div className="mt-4 border-2 border-black bg-white overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-black text-white">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Search Result</p>
                            <h2 className="text-xl font-black">Order #{result.receiptNumber}</h2>
                            <p className="text-white/60 text-xs mt-0.5">
                                {result.auction?.title || 'Unknown item'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-3 py-1 border text-[10px] font-black uppercase tracking-widest ${statusTone(result.status)}`}>
                                {result.status.replace(/_/g, ' ')}
                            </span>
                            <Link
                                href={`/orders/${result.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
                            >
                                Open Order
                            </Link>
                        </div>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Parties */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="border border-gray-200 bg-gray-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                    <User className="h-3 w-3" /> Buyer
                                </p>
                                <p className="font-black text-black text-sm">{result.buyer?.full_name || 'Unnamed'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{result.buyer?.email || 'No email'}</p>
                                <p className="text-xs text-gray-500">{result.buyer?.phone_number || 'No phone'}</p>
                                {result.buyer?.id && (
                                    <Link href={`/users/${result.buyer.id}`} target="_blank" className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-black underline underline-offset-2">
                                        View profile
                                    </Link>
                                )}
                            </div>
                            <div className="border border-gray-200 bg-gray-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                    <User className="h-3 w-3" /> Seller
                                </p>
                                <p className="font-black text-black text-sm">{result.seller?.full_name || 'Unnamed'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{result.seller?.email || 'No email'}</p>
                                <p className="text-xs text-gray-500">{result.seller?.phone_number || 'No phone'}</p>
                                {result.seller?.id && (
                                    <Link href={`/users/${result.seller.id}`} target="_blank" className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest text-black underline underline-offset-2">
                                        View profile
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Order details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="border border-gray-200 bg-gray-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                    <Package className="h-3 w-3" /> Order Details
                                </p>
                                <dl className="space-y-2 text-sm">
                                    {[
                                        ['Amount', formatCurrency(result.amount)],
                                        ['Payment', result.payment_method?.replace(/_/g, ' ') || '-'],
                                        ['Fulfillment', result.fulfillment_type?.replace(/_/g, ' ') || '-'],
                                        ['Meetup / Address', result.meetup_location || '-'],
                                        ['Placed', new Date(result.created_at).toLocaleString('en-GH')],
                                        ['Updated', result.updated_at ? new Date(result.updated_at).toLocaleString('en-GH') : '-'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex items-start justify-between gap-4">
                                            <dt className="text-gray-500 shrink-0">{label}</dt>
                                            <dd className="font-semibold text-black text-right">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div className="border border-gray-200 bg-gray-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                                    <Receipt className="h-3 w-3" /> Delivery & Codes
                                </p>
                                <dl className="space-y-2 text-sm">
                                    {[
                                        ['Delivery status', result.delivery?.status?.replace(/_/g, ' ') || 'No delivery'],
                                        ['Delivery code', result.delivery?.delivery_code || 'Not generated'],
                                        ['Code used at', result.delivery?.delivered_at ? new Date(result.delivery.delivered_at).toLocaleString('en-GH') : 'Not yet'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex items-start justify-between gap-4">
                                            <dt className="text-gray-500 shrink-0">{label}</dt>
                                            <dd className="font-mono font-black text-black text-right">{value}</dd>
                                        </div>
                                    ))}
                                    {result.cancellation_reason && (
                                        <div className="mt-2 border border-red-200 bg-red-50 p-2 rounded">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Cancellation Reason</p>
                                            <p className="text-xs text-red-700">{result.cancellation_reason}</p>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        </div>

                        {/* Chat transcript */}
                        <div className="border border-gray-200">
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <MessageSquare className="h-4 w-4 text-gray-500" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    Chat Transcript ({result.transcript.length} messages)
                                </p>
                            </div>
                            {result.transcript.length === 0 ? (
                                <p className="px-4 py-6 text-sm text-gray-400 text-center">No messages exchanged.</p>
                            ) : (
                                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                                    {result.transcript.map((msg) => (
                                        <div key={msg.id} className="px-4 py-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-black">{msg.senderName}</span>
                                                <span className="text-[10px] text-gray-400">{msg.sentAtLabel}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{msg.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

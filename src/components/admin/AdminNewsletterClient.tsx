'use client';

import { useState, useTransition } from 'react';
import {
    Check, X, Send, Loader2, AlertTriangle, Calendar,
    ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react';
import type { NewsItem } from '@/app/admin/newsletter/page';

function NewsItemCard({
    item,
    selected,
    onToggle,
    expanded,
    onExpand,
}: {
    item: NewsItem;
    selected: boolean;
    onToggle: () => void;
    expanded: boolean;
    onExpand: () => void;
}) {
    return (
        <div className={`border ${selected ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'} overflow-hidden`}>
            <div className="flex items-start gap-3 px-4 py-3">
                <button
                    type="button"
                    onClick={onToggle}
                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-transparent hover:border-gray-400'}`}
                >
                    <Check className="h-3 w-3" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-black text-sm leading-snug line-clamp-1">{item.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(item.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onExpand}
                    className="text-gray-400 hover:text-black transition-colors"
                >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">{item.content}</pre>
                </div>
            )}
        </div>
    );
}

export default function AdminNewsletterClient({
    newsItems,
    subscriberCount,
}: {
    newsItems: NewsItem[];
    subscriberCount: number;
}) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customDate, setCustomDate] = useState('');
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ ok: boolean; msg: string; sent?: number; total?: number } | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);

    const toggleItem = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === newsItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(newsItems.map((i) => i.id)));
        }
    };

    const sendNewsletter = () => {
        setResult(null);
        startTransition(async () => {
            const body: { newsIds: string[]; dateLabel?: string } = { newsIds: Array.from(selectedIds) };
            if (customDate.trim()) body.dateLabel = customDate.trim();

            const res = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) {
                setResult({ ok: false, msg: data.error || 'Failed to send newsletter' });
            } else {
                setResult({
                    ok: true,
                    msg: `Successfully sent ${data.sent} of ${data.total_subscribers} emails`,
                    sent: data.sent,
                    total: data.total_subscribers,
                });
                setSelectedIds(new Set());
            }
            setConfirming(false);
        });
    };

    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div className="space-y-6">
            {/* Subscriber count */}
            <div className="border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Subscribers</p>
                        <p className="text-2xl font-black text-black mt-1">{subscriberCount}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Published News Items</p>
                        <p className="text-2xl font-black text-black mt-1">{newsItems.length}</p>
                    </div>
                </div>
            </div>

            {/* Selection controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs font-bold text-gray-600 hover:text-black transition-colors"
                    >
                        {selectedIds.size === newsItems.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-xs text-gray-400">
                        {selectedIds.size} selected
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        Custom date label (optional):
                    </label>
                    <input
                        type="text"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        placeholder={today}
                        className="border border-gray-200 px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black w-48"
                    />
                </div>
            </div>

            {/* News items list */}
            {newsItems.length === 0 ? (
                <div className="border border-gray-200 bg-white p-12 text-center">
                    <p className="text-sm font-black text-black">No published news items</p>
                    <p className="text-xs text-gray-400 mt-1">Publish some news items first to include them in the newsletter.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {newsItems.map((item) => (
                        <NewsItemCard
                            key={item.id}
                            item={item}
                            selected={selectedIds.has(item.id)}
                            onToggle={() => toggleItem(item.id)}
                            expanded={expandedId === item.id}
                            onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        />
                    ))}
                </div>
            )}

            {/* Result message */}
            {result && (
                <div className={`flex items-center gap-2 px-4 py-3 border text-sm font-semibold ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {result.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {result.msg}
                </div>
            )}

            {/* Send button */}
            {confirming ? (
                <div className="border-2 border-black bg-white p-5 space-y-4">
                    <p className="text-sm font-bold text-black">
                        Send newsletter to {subscriberCount} subscribers?
                    </p>
                    <p className="text-xs text-gray-500">
                        {selectedIds.size} news item{selectedIds.size !== 1 ? 's' : ''} will be included.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={sendNewsletter}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 transition-colors"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {isPending ? 'Sending...' : 'Yes, Send Now'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                        >
                            <X className="h-4 w-4" /> Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={selectedIds.size === 0 || isPending}
                    className="w-full sm:w-auto inline-flex items-center gap-2 bg-black text-white px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="h-4 w-4" />
                    Send Newsletter
                </button>
            )}
        </div>
    );
}

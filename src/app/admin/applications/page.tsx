'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import { createClient } from '@/lib/supabase/client';
import { reviewSellerApplication } from '@/app/actions/sellerApplication';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { SellerApplicationStatus } from '@/types/database';

interface Application {
    id: string;
    user_id: string;
    full_name: string;
    phone_number: string;
    location: string;
    items_to_sell: string;
    experience: string;
    id_type: string;
    id_number: string;
    status: SellerApplicationStatus;
    admin_notes: string | null;
    created_at: string;
    profiles: {
        username: string;
        avatar_url: string | null;
    } | null;
}

const STATUS_LABELS: Record<SellerApplicationStatus, { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
    approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

type FilterTab = 'all' | SellerApplicationStatus;

function ApplicationRow({ app, onReviewed }: { app: Application; onReviewed: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [rowError, setRowError] = useState('');

    const { label, className, icon: Icon } = STATUS_LABELS[app.status];

    const handle = async (action: 'approved' | 'rejected') => {
        setRowError('');
        setLoading(true);
        const result = await reviewSellerApplication(app.id, action, notes);
        setLoading(false);
        if (!result.success) {
            setRowError(result.error || 'Failed');
        } else {
            onReviewed();
        }
    };

    return (
        <div className="border border-gray-200 bg-white">
            {/* Summary row */}
            <button
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-black text-xs shrink-0">
                        {app.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-black truncate">{app.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">@{app.profiles?.username} · {app.location}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border ${className}`}>
                        <Icon className="h-3 w-3" />
                        {label}
                    </span>
                    <span className="text-[11px] text-gray-400 hidden sm:block">
                        {new Date(app.created_at).toLocaleDateString('en-GH', { dateStyle: 'medium' })}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
            </button>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-5 pt-1 border-t border-gray-100 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <Field label="Phone" value={app.phone_number} />
                        <Field label="ID Type" value={app.id_type} />
                        <Field label="ID Number" value={app.id_number} />
                        <Field label="Applied" value={new Date(app.created_at).toLocaleString('en-GH')} />
                        <div className="sm:col-span-2">
                            <Field label="What they plan to sell" value={app.items_to_sell} />
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Selling experience" value={app.experience} />
                        </div>
                        {app.admin_notes && (
                            <div className="sm:col-span-2">
                                <Field label="Admin notes" value={app.admin_notes} />
                            </div>
                        )}
                    </div>

                    {app.status === 'pending' && (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    Notes (optional — shown to applicant on rejection)
                                </label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
                                    placeholder="Reason for rejection or any feedback…"
                                />
                            </div>
                            {rowError && <p className="text-sm text-red-600">{rowError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handle('approved')}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50"
                                >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Approve
                                </button>
                                <button
                                    onClick={() => handle('rejected')}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{value}</p>
        </div>
    );
}

function ApplicationsContent() {
    const [apps, setApps] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('pending');

    const load = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();
        const { data } = await supabase
            .from('seller_applications')
            .select('*, profiles:user_id(username, avatar_url)')
            .order('created_at', { ascending: false });
        setApps((data as Application[]) ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);
    const counts: Record<FilterTab, number> = {
        all: apps.length,
        pending: apps.filter(a => a.status === 'pending').length,
        approved: apps.filter(a => a.status === 'approved').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
    };

    const tabs: FilterTab[] = ['pending', 'approved', 'rejected', 'all'];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-10">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-black tracking-tight">Seller Applications</h1>
                <p className="text-sm text-gray-400 mt-0.5">Review and approve seller applications from users</p>
            </div>

            {/* Filter tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${filter === tab ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
                    >
                        {tab} {counts[tab] > 0 && <span className="ml-1 text-[10px]">({counts[tab]})</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-200 border-t-black" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-sm font-semibold">No {filter === 'all' ? '' : filter} applications</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(app => (
                        <ApplicationRow key={app.id} app={app} onReviewed={load} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminApplicationsPage() {
    return (
        <AdminGuard>
            <ApplicationsContent />
        </AdminGuard>
    );
}

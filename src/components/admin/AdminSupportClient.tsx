'use client';

import { useState } from 'react';
import { adminSetSupportStatus } from '@/app/actions/support';

export interface SupportRow {
    id: string;
    created_at: string;
    name: string;
    email: string;
    topic: string;
    message: string;
    status: 'new' | 'in_progress' | 'resolved';
}

const LABEL = { new: 'New', in_progress: 'In progress', resolved: 'Resolved' } as const;

export default function AdminSupportClient({ initial }: { initial: SupportRow[] }) {
    const [rows, setRows] = useState(initial);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState('');

    const setStatus = async (id: string, status: SupportRow['status']) => {
        setBusy(id);
        setError('');
        const res = await adminSetSupportStatus(id, status);
        setBusy(null);
        if (res.success) setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
        else setError(res.error || 'Could not update');
    };

    if (rows.length === 0) return <p className="text-sm text-gray-500">No support requests yet.</p>;

    return (
        <div className="space-y-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {rows.map((r) => (
                <div key={r.id} className="border border-gray-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-black">{r.topic}</p>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 ${r.status === 'new' ? 'bg-amber-100 text-amber-800' : r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                            {LABEL[r.status]}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {r.name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> · {new Date(r.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-black mt-3 whitespace-pre-wrap break-words">{r.message}</p>
                    <div className="flex gap-2 mt-4">
                        {(['new', 'in_progress', 'resolved'] as const).filter((s) => s !== r.status).map((s) => (
                            <button key={s} disabled={busy === r.id} onClick={() => setStatus(r.id, s)} className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-black hover:border-black transition-colors disabled:opacity-50">
                                Mark {LABEL[s].toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

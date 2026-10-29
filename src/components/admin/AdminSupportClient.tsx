'use client';

import { useState } from 'react';
import { adminSetSupportStatus, adminSendSupportReply } from '@/app/actions/support';

export interface SupportRow {
    id: string;
    created_at: string;
    name: string;
    email: string;
    topic: string;
    message: string;
    status: 'new' | 'in_progress' | 'resolved';
}

export interface SupportReply {
    id: string;
    request_id?: string;
    created_at: string;
    to_email: string;
    subject: string;
    body: string;
    from_address: string;
}

const LABEL = { new: 'New', in_progress: 'In progress', resolved: 'Resolved' } as const;

export default function AdminSupportClient({ initial, replies: initialReplies, sender, enabled }: { initial: SupportRow[]; replies: SupportReply[]; sender: string; enabled: boolean }) {
    const [rows, setRows] = useState(initial);
    const [replies, setReplies] = useState(initialReplies);
    const [composing, setComposing] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    const sendReply = async (r: SupportRow) => {
        if (sending) return;
        if (!window.confirm(`Send this reply to ${r.email} from ${sender}?`)) return;
        setSending(true);
        setError('');
        const res = await adminSendSupportReply(r.id, draft);
        setSending(false);
        if (res.success) {
            if (res.reply) setReplies((x) => [...x, { ...res.reply!, request_id: r.id }]);
            setRows((x) => x.map((y) => (y.id === r.id && y.status === 'new' ? { ...y, status: 'in_progress' } : y)));
            setDraft('');
            setComposing(null);
        } else {
            setError(res.error || 'Could not send the reply');
        }
    };
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

    const notice = enabled ? null : (
        <p className="text-xs text-gray-500 border border-gray-200 p-3 mb-3">Email replies are not turned on yet. Reply from your own inbox using the customer&apos;s address for now.</p>
    );

    if (rows.length === 0) return <p className="text-sm text-gray-500">No support requests yet.</p>;

    return (
        <div className="space-y-3">
            {notice}
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
                    {replies.filter((x) => x.request_id === r.id).map((x) => (
                        <div key={x.id} className="mt-3 border-l-2 border-black pl-3">
                            <p className="text-[11px] text-gray-500">Sent {new Date(x.created_at).toLocaleString()} from {x.from_address} to {x.to_email}</p>
                            <p className="text-sm text-black whitespace-pre-wrap break-words mt-1">{x.body}</p>
                        </div>
                    ))}
                    {composing === r.id && (
                        <div className="mt-4 border border-gray-200 p-3">
                            <p className="text-[11px] text-gray-500 mb-2">To: {r.email} · From: {sender}</p>
                            <textarea rows={5} maxLength={5000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your reply" className="w-full border border-gray-200 px-3 py-2 text-sm text-black focus:outline-none focus:border-black resize-none" />
                            <p className="text-[11px] text-gray-500 mt-2">The customer&apos;s answer will not appear here. It goes to the reply address of the sender mailbox, so watch that inbox.</p>
                            <div className="flex gap-2 mt-3">
                                <button disabled={sending} onClick={() => sendReply(r)} className="px-4 py-2 bg-black text-white text-xs font-semibold hover:bg-gray-900 disabled:opacity-50">{sending ? 'Sending...' : 'Send reply'}</button>
                                <button disabled={sending} onClick={() => { setComposing(null); setDraft(''); }} className="px-4 py-2 border border-gray-200 text-xs font-semibold text-black hover:border-black">Cancel</button>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 mt-4">
                        {composing !== r.id && enabled && (
                            <button onClick={() => { setComposing(r.id); setDraft(''); }} className="px-3 py-1.5 bg-black text-white text-xs font-semibold hover:bg-gray-900">Reply by email</button>
                        )}
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

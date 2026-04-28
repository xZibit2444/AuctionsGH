'use client';

import { useState, useTransition } from 'react';
import {
    Plus, Eye, EyeOff, Pencil, Trash2, Check, X,
    AlertTriangle, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import {
    adminCreateNewsItem,
    adminUpdateNewsItem,
    adminDeleteNewsItem,
} from '@/app/actions/adminNews';
import type { AdminNewsItem } from '@/app/admin/news/page';

const CATEGORY_TAGS = ['[VEHICLE]', '[PROPERTY]', '[EQUIPMENT]', '[ANNOUNCEMENT]', '[AUCTION NOTICE]'];

const CONTENT_PLACEHOLDER = `Owner: Name here
Date: Day DD Mon YYYY, H:MMam
Location: Place
Auctioneer: Name | Phone
Source: Publication, Date
Notes: Any extra info`;

function NewsItemRow({
    item,
    onUpdated,
    onDeleted,
}: {
    item: AdminNewsItem;
    onUpdated: (id: string, updates: Partial<AdminNewsItem>) => void;
    onDeleted: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [titleDraft, setTitleDraft] = useState(item.title);
    const [contentDraft, setContentDraft] = useState(item.content);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const act = (
        fn: () => Promise<{ success: boolean; error?: string }>,
        successMsg: string,
        updates?: Partial<AdminNewsItem>
    ) => {
        setFeedback(null);
        startTransition(async () => {
            const res = await fn();
            if (res.success) {
                setFeedback({ ok: true, msg: successMsg });
                if (updates) onUpdated(item.id, updates);
            } else {
                setFeedback({ ok: false, msg: res.error ?? 'Failed' });
            }
        });
    };

    const togglePublish = () => act(
        () => adminUpdateNewsItem(item.id, { is_published: !item.is_published }),
        item.is_published ? 'Unpublished' : 'Published',
        { is_published: !item.is_published }
    );

    const saveEdit = () => act(
        () => adminUpdateNewsItem(item.id, { title: titleDraft, content: contentDraft }),
        'Saved',
        { title: titleDraft.trim(), content: contentDraft.trim() }
    );

    const doDelete = () => {
        setFeedback(null);
        startTransition(async () => {
            const res = await adminDeleteNewsItem(item.id);
            if (res.success) onDeleted(item.id);
            else setFeedback({ ok: false, msg: res.error ?? 'Failed' });
        });
    };

    return (
        <div className="border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${item.is_published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                            {item.is_published ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                            {item.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {new Date(item.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <p className="font-bold text-black text-sm leading-snug line-clamp-1">{item.title}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={togglePublish}
                        disabled={isPending}
                        title={item.is_published ? 'Unpublish' : 'Publish'}
                        className={`border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${item.is_published ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : item.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setEditing(true); setExpanded(true); }}
                        className="border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] text-gray-600 hover:border-black hover:text-black transition-colors"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] text-gray-600 hover:border-black hover:text-black transition-colors"
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
                    {feedback && (
                        <div className={`flex items-center gap-2 px-3 py-2 border text-xs font-semibold ${feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {feedback.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {feedback.msg}
                        </div>
                    )}

                    {editing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Title</label>
                                <input
                                    type="text"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    className="w-full border border-gray-200 px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Content</label>
                                <textarea
                                    value={contentDraft}
                                    onChange={(e) => setContentDraft(e.target.value)}
                                    rows={6}
                                    className="w-full border border-gray-200 px-3 py-2 text-sm text-black font-mono focus:outline-none focus:border-black resize-y"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => { saveEdit(); setEditing(false); }}
                                    className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditing(false); setTitleDraft(item.title); setContentDraft(item.content); }}
                                    className="inline-flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 px-4 py-2 text-xs font-black uppercase tracking-widest hover:border-black"
                                >
                                    <X className="h-3 w-3" /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">{item.content}</pre>
                    )}

                    {/* Delete */}
                    <div className="pt-2 border-t border-gray-200">
                        {confirmDelete ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-500">Delete permanently?</span>
                                <button type="button" onClick={doDelete} disabled={isPending} className="inline-flex items-center gap-1 border border-red-300 bg-red-600 text-white px-3 py-1 text-[10px] font-black uppercase disabled:opacity-50">
                                    <Check className="h-3 w-3" /> Yes, delete
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(false)} className="inline-flex items-center gap-1 border border-gray-200 bg-white text-gray-600 px-3 py-1 text-[10px] font-black uppercase">
                                    <X className="h-3 w-3" /> Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="inline-flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="h-3 w-3" /> Delete
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function CreateNewsForm({ onCreated }: { onCreated: (item: AdminNewsItem) => void }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [published, setPublished] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const insertTag = (tag: string) => {
        setTitle((prev) => prev.startsWith('[') ? prev.replace(/^\[[^\]]*\]\s*/, tag + ' ') : tag + ' ' + prev);
    };

    const handleSubmit = () => {
        setError(null);
        startTransition(async () => {
            const res = await adminCreateNewsItem({ title, content, is_published: published });
            if (res.success && res.id) {
                onCreated({ id: res.id, title: title.trim(), content: content.trim(), is_published: published, created_at: new Date().toISOString() });
                setTitle('');
                setContent('');
                setPublished(true);
                setOpen(false);
            } else {
                setError(res.error ?? 'Failed to create');
            }
        });
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-colors mb-6"
            >
                <Plus className="h-4 w-4" /> New News Item
            </button>
        );
    }

    return (
        <div className="border-2 border-black bg-white p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-widest text-black">New News Item</p>
                <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-black">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> {error}
                </div>
            )}

            {/* Category tag quick-insert */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Category Tag</p>
                <div className="flex flex-wrap gap-2">
                    {CATEGORY_TAGS.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => insertTag(tag)}
                            className="border border-gray-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-black hover:text-black transition-colors"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Title *</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="[VEHICLE] Toyota Land Cruiser - Reg. GT 1234-20"
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder:text-gray-300"
                />
            </div>

            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Content *</label>
                <p className="text-[10px] text-gray-400 mb-1.5">Use <code className="bg-gray-100 px-1">Label: Value</code> on each line — these are parsed into rows on the news page.</p>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    placeholder={CONTENT_PLACEHOLDER}
                    className="w-full border border-gray-200 px-3 py-2 text-sm text-black font-mono focus:outline-none focus:border-black resize-y placeholder:text-gray-300"
                />
            </div>

            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                        onClick={() => setPublished((v) => !v)}
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${published ? 'bg-black' : 'bg-gray-200'} relative`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm font-bold text-black">{published ? 'Publish immediately' : 'Save as draft'}</span>
                </label>
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || !title.trim() || !content.trim()}
                    className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {isPending ? 'Saving...' : published ? 'Publish Now' : 'Save Draft'}
                </button>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default function AdminNewsClient({ initialItems }: { initialItems: AdminNewsItem[] }) {
    const [items, setItems] = useState<AdminNewsItem[]>(initialItems);

    const onCreated = (item: AdminNewsItem) => setItems((prev) => [item, ...prev]);

    const onUpdated = (id: string, updates: Partial<AdminNewsItem>) =>
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...updates } : i));

    const onDeleted = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

    const published = items.filter((i) => i.is_published).length;
    const drafts = items.filter((i) => !i.is_published).length;

    return (
        <div>
            <CreateNewsForm onCreated={onCreated} />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Total', value: items.length },
                    { label: 'Published', value: published },
                    { label: 'Drafts', value: drafts },
                ].map(({ label, value }) => (
                    <div key={label} className="border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                        <p className="text-2xl font-black text-black">{value}</p>
                    </div>
                ))}
            </div>

            {items.length === 0 ? (
                <div className="border border-gray-200 bg-white p-12 text-center">
                    <p className="text-sm font-black text-black">No news items yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click &quot;New News Item&quot; above to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <NewsItemRow
                            key={item.id}
                            item={item}
                            onUpdated={onUpdated}
                            onDeleted={onDeleted}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

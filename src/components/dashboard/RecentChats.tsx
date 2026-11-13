'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

type Chat = { auction_id: string; buyer_id: string; body: string; created_at: string; auctions: { title: string } | null };

export default function RecentChats() {
    const { user } = useAuth();
    const [threads, setThreads] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        async function load() {
            try {
            const supabase = createClient();
            // RLS limits this query to the signed-in buyer's or seller's messages.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('auction_offer_messages') as any)
                .select('auction_id, buyer_id, body, created_at, auctions(title)')
                .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
                .order('created_at', { ascending: false }).limit(500);
            if (cancelled) return;
            if (error) setFailed(true);
            const seen = new Set<string>();
            setThreads(((data ?? []) as Chat[]).filter(m => {
                const key = `${m.auction_id}:${m.buyer_id}`;
                if (seen.has(key)) return false;
                seen.add(key); return true;
            }).slice(0, 12));
            setLoading(false);
            } catch { if (!cancelled) { setFailed(true); setLoading(false); } }
        }
        void load();
        return () => { cancelled = true; };
    }, [user]);
    return <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-black text-black mb-2">Recent chats</h2>
        <p className="text-xs text-gray-500 mb-4">Continue buyer and seller conversations. No offer or order is needed.</p>
        {loading ? <p className="text-sm text-gray-500">Loading chats...</p> : failed ? <p className="text-sm text-red-600">Chats could not be loaded. Try again later.</p> : threads.length === 0 ? <p className="text-sm text-gray-500">No chats yet. Open a listing and choose Message seller.</p> : <div className="divide-y divide-gray-100">{threads.map(t => <Link key={`${t.auction_id}:${t.buyer_id}`} href={`/chat/${t.auction_id}?buyer=${t.buyer_id}`} className="block py-3 hover:underline">
            <p className="text-sm font-bold text-black">{t.auctions?.title ?? 'Listing chat'}</p>
            <p className="text-xs text-gray-500 truncate">{t.body}</p>
        </Link>)}</div>}
    </section>;
}

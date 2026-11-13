import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAnalyticsPage({ searchParams }: Props) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single();
    if (!profile?.is_super_admin) redirect('/');
    const params = searchParams ? await searchParams : {};
    const today = new Date().toISOString().slice(0, 10);
    const defaultStart = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const dateParam = (value: string | string[] | undefined, fallback: string) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? value : fallback;
    const start = dateParam(params.start, defaultStart);
    const end = dateParam(params.end, today);
    const admin = createAdminClient();
    async function count(table: string, ranged = true, active = false) {
        // Tables not yet included in generated database types are still counted server-side.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (admin.from(table as any) as any).select('id', { count: 'exact', head: true });
        if (ranged) query = query.gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59.999Z`);
        if (active) query = query.eq('status', 'active');
        const result = await query;
        return result.error ? null : (result.count ?? 0) as number;
    }
    const [listings, activeListings, bids, offers, messages, saves, accounts] = await Promise.all([
        count('auctions'), count('auctions', false, true), count('bids'), count('auction_offers'),
        count('auction_offer_messages'), count('watchlist'), count('profiles'),
    ]);
    const cards = [
        ['Listings created', listings, 'New listings in the selected dates.'],
        ['Active listings now', activeListings, 'Current snapshot across fixed-price listings and timed auctions, not date-filtered.'],
        ['Bids placed', bids, 'Bidding activity, not payments.'],
        ['Offers created', offers, 'Negotiation activity, not confirmed sales.'],
        ['In-house messages sent', messages, 'Message count, not unique conversations or completed deals.'],
        ['Saved listings added', saves, 'Current saved records created in the selected dates. Removed saves are not counted.'],
        ['Accounts created', accounts, 'New accounts in the selected dates.'],
    ] as const;
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">Marketplace activity</p>
        <h1 className="text-3xl font-black text-black mt-2">Analytics</h1>
        <p className="text-sm text-gray-500 mt-3 max-w-3xl">Buyers and sellers arrange deals directly. AuctionsGH does not verify whether a sale happened or how much was paid, so sales, sold value, revenue and sales-conversion metrics are not shown.</p>
        <div className="flex flex-wrap gap-3 my-5 text-sm font-bold">
            <Link href="/dashboard" className="underline">Dashboard</Link>
            <Link href="/admin/orders" className="underline">Past order records</Link>
            <Link href="/admin/applications" className="underline">Seller applications</Link>
        </div>
        <form className="flex flex-wrap items-end gap-4 rounded-2xl bg-white border border-gray-200 p-5 mb-6">
            <label className="text-xs font-bold text-gray-600">Start (GMT)<input aria-label="Start date" type="date" name="start" defaultValue={start} className="block mt-2 rounded-lg border border-gray-200 p-2 text-black" /></label>
            <label className="text-xs font-bold text-gray-600">End (GMT)<input aria-label="End date" type="date" name="end" defaultValue={end} className="block mt-2 rounded-lg border border-gray-200 p-2 text-black" /></label>
            <button type="submit" className="rounded-xl bg-amber-400 text-black px-5 py-3 text-sm font-bold">Apply dates</button>
        </form>
        {start > end ? <p className="text-red-600 mb-5">Start date must be before the end date.</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(([label, value, help]) => <section key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</h2>
            <p className="text-3xl font-black text-black mt-3">{value === null ? 'Unavailable' : value.toLocaleString('en-GH')}</p>
            <p className="text-xs text-gray-500 mt-3 leading-5">{help}</p>
        </section>)}</div>
        <p className="text-xs text-gray-500 mt-6 leading-5">WhatsApp conversations and direct payments happen outside AuctionsGH and are not measured. Past order records remain available as history. Sellers can still mark a listing sold to take it off the market; that status is not treated as proof of a transaction.</p>
    </div>;
}

'use client';



import { useMemo, useState } from 'react';



type NewsUpdate = {

    id: string;

    title: string;

    content: string;

    created_at: string;

};



interface NewsPageClientProps {

    initialNews: NewsUpdate[];

    error?: unknown;

}



function parseContent(content: string) {

    return content

        .split('\n')

        .map((line) => line.trim())

        .filter(Boolean)



        .map((line) => {

            const separatorIndex = line.indexOf(':');



            if (separatorIndex === -1) {

                return { label: '', value: line };

            }



            return {

                label: line.slice(0, separatorIndex).trim(),

                value: line.slice(separatorIndex + 1).trim(),

            };

        });

}



function getCategoryFromTitle(title: string) {
    const match = title.match(/^\[([^\]]+)\]/);
    if (!match) return 'Other';
    // Normalise case so "PROPERTY" and "Property" are one filter.
    const raw = match[1].trim().toLowerCase();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const KEY_FIELDS = ['date', 'location', 'auctioneer'];

function renderValue(value: string) {
    // Make phone numbers tappable. Only digit groups that look like Ghana numbers.
    const parts = value.split(/(\b0\d{9}\b)/g);
    return parts.map((part, i) =>
        /^0\d{9}$/.test(part) ? (
            <a key={i} href={`tel:${part}`} className="underline decoration-gray-300 underline-offset-2 hover:decoration-black">{part}</a>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}



function getDisplayTitle(title: string) {

    return title.replace(/^\[[^\]]+\]\s*/, '').trim();

}



function getFieldValue(content: string, label: string) {

    return parseContent(content).find((entry) => entry.label.toLowerCase() === label.toLowerCase())?.value ?? null;

}

export default function NewsPageClient({ initialNews, error }: NewsPageClientProps) {
    const [news] = useState(initialNews);
    const [activeFilter, setActiveFilter] = useState('All');
    const categories = useMemo(() => ['All', ...Array.from(new Set(news.map((item) => getCategoryFromTitle(item.title))))], [news]);
    const filteredNews = useMemo(
        () => (activeFilter === 'All' ? news : news.filter((item) => getCategoryFromTitle(item.title) === activeFilter)),
        [activeFilter, news]
    );

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 pb-28 sm:pb-16">
            <header className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Updates</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">News &amp; Updates</h1>
                <p className="text-sm text-gray-500 mt-2 max-w-xl">
                    Auction notices, marketplace announcements and important updates from AuctionsGH.
                </p>
                {!error && news.length > 0 && (
                    <p className="text-xs text-gray-400 mt-3">
                        {news.length} notices · Latest: <span className="text-gray-600 font-semibold">{getDisplayTitle(news[0]?.title ?? '')}</span>
                    </p>
                )}
            </header>

            {news.length > 0 && (
                <nav aria-label="Filter notices" className="sticky top-0 z-10 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 bg-white/95 backdrop-blur border-b border-gray-100 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {categories.map((category) => {
                            const isActive = activeFilter === category;
                            return (
                                <button
                                    key={category}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setActiveFilter(category)}
                                    className={`shrink-0 px-3.5 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${isActive ? 'bg-black text-white' : 'border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-gray-400'}`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </nav>
            )}

            {Boolean(error) && news.length === 0 && (
                <div className="border border-amber-200 bg-amber-50 p-5 sm:p-6 mb-8">
                    <h2 className="text-sm font-black uppercase tracking-widest text-amber-900 mb-2">Preview mode</h2>
                    <p className="text-sm text-amber-800 leading-relaxed">
                        The `news_updates` table is not available yet, so this page is showing sample content for testing.
                        Apply `supabase/migrations/20260416120000_create_news_updates.sql` to enable live news posts.
                    </p>
                </div>
            )}

            {filteredNews.length === 0 ? (
                <div className="border border-gray-200 bg-gray-50 p-6 sm:p-8">
                    <h2 className="text-sm font-black uppercase tracking-widest text-black mb-2">
                        {news.length === 0 ? 'No updates yet' : `No ${activeFilter.toLowerCase()} notices`}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        {news.length === 0
                            ? 'There are no news updates available right now. Check back soon for announcements and platform updates.'
                            : 'Try another filter to view more auction notices.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {filteredNews.map((item) => {
                        const entries = parseContent(item.content);
                        const category = getCategoryFromTitle(item.title);
                        const reserved = getFieldValue(item.content, 'Reserved Price');
                        const key = entries.filter((e) => e.label && KEY_FIELDS.includes(e.label.toLowerCase()));
                        const rest = entries.filter((e) => !(e.label && KEY_FIELDS.includes(e.label.toLowerCase())));

                        return (
                            <article key={item.id} className="border border-gray-200 bg-white">
                                <div className="px-4 pt-4 sm:px-6 sm:pt-5">
                                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                        <span className="inline-flex items-center bg-black px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                                            {category}
                                        </span>
                                        {reserved && (
                                            <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${reserved.toLowerCase() === 'yes' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                                {reserved.toLowerCase() === 'yes' ? 'Reserved Price' : 'No Reserve'}
                                            </span>
                                        )}
                                        <time dateTime={item.created_at} className="ml-auto text-[11px] font-semibold text-gray-400">
                                            {new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </time>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-black leading-snug">{getDisplayTitle(item.title)}</h2>
                                </div>

                                {key.length > 0 && (
                                    <dl className="mx-4 sm:mx-6 mt-4 border-l-2 border-amber-400 bg-gray-50 px-4 py-3 space-y-2">
                                        {key.map((entry, i) => (
                                            <div key={`${item.id}-k-${i}`} className="grid gap-0.5 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-3">
                                                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 sm:pt-0.5">{entry.label}</dt>
                                                <dd className="text-sm font-semibold text-black leading-6 break-words">{renderValue(entry.value)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}

                                {rest.length > 0 && (
                                    <dl className="px-4 sm:px-6 py-4 divide-y divide-gray-100">
                                        {rest.map((entry, i) => (
                                            <div key={`${item.id}-r-${i}`} className="grid gap-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-3">
                                                {entry.label ? (
                                                    <>
                                                        <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 sm:pt-0.5">{entry.label}</dt>
                                                        <dd className="text-sm text-gray-700 leading-6 break-words">{renderValue(entry.value)}</dd>
                                                    </>
                                                ) : (
                                                    <dd className="text-sm text-gray-700 leading-6 break-words sm:col-span-2">{renderValue(entry.value)}</dd>
                                                )}
                                            </div>
                                        ))}
                                    </dl>
                                )}
                                {rest.length === 0 && <div className="pb-4" />}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

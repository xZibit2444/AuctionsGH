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

    error?: any;

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

    return match ? match[1].trim() : 'Other';

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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-28 sm:pb-16">

            <div className="border border-gray-200 bg-white p-6 sm:p-8 mb-8">

                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Updates</p>



                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">News & Updates</h1>

                <p className="text-sm text-gray-500 mt-3 max-w-2xl">

                    Follow auction notices, marketplace announcements, and important updates from AuctionsGH.

                </p>

                {!error && news.length > 0 && (

                    <div className="mt-6 flex flex-wrap gap-3">



                        <div className="border border-gray-200 bg-gray-50 px-4 py-3 min-w-[160px]">

                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Published notices</p>

                            <p className="text-2xl font-black text-black mt-2">{news.length}</p>

                        </div>

                        <div className="border border-gray-200 bg-gray-50 px-4 py-3 min-w-[220px]">

                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Latest notice</p>

                            <p className="text-sm font-semibold text-black mt-2 line-clamp-2">{getDisplayTitle(news[0]?.title ?? '')}</p>

                        </div>

                    </div>

                )}



                {news.length > 0 && (

                    <div className="mt-6 flex flex-wrap gap-2">

                        {categories.map((category) => {

                            const isActive = activeFilter === category;



                            return (

                                <button

                                    key={category}

                                    type="button"

                                    onClick={() => setActiveFilter(category)}

                                    className={`border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${isActive ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-500 hover:text-black hover:border-gray-400'}`}

                                >

                                    {category}

                                </button>

                            );

                        })}

                    </div>

                )}

            </div>



            {error && news.length === 0 && (

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

                <div className="space-y-4">

                    {filteredNews.map((item) => {

                        const parsedContent = parseContent(item.content);

                        const category = getCategoryFromTitle(item.title);

                        const reserved = getFieldValue(item.content, 'Reserved Price') ?? getFieldValue(item.content, 'Reserved price');



                        return (

                            <article key={item.id} className="border border-gray-200 bg-white overflow-hidden">

                                <div className="border-b border-gray-200 bg-[linear-gradient(135deg,#fafafa_0%,#ffffff_60%,#f5f5f5_100%)] px-4 py-4 sm:px-5 sm:py-4">



                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                        <div className="min-w-0">

                                            <div className="flex flex-wrap items-center gap-2 mb-2">

                                                <span className="inline-flex items-center border border-gray-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">

                                                    Notice

                                                </span>

                                                {category && (

                                                    <span className="inline-flex items-center border border-gray-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">

                                                        {category}

                                                    </span>

                                                )}

                                                {reserved && (

                                                    <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${reserved.toLowerCase() === 'yes' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>

                                                        {reserved.toLowerCase() === 'yes' ? 'Reserved Price' : 'No Reserve'}

                                                    </span>

                                                )}

                                            </div>

                                            <h2 className="text-lg sm:text-xl font-black tracking-tight text-black leading-tight">{getDisplayTitle(item.title)}</h2>

                                        </div>

                                        <time className="text-[11px] font-black uppercase tracking-widest text-gray-400 shrink-0">

                                            {new Date(item.created_at).toLocaleDateString('en-US', {

                                                year: 'numeric',

                                                month: 'long',

                                                day: 'numeric',

                                            })}

                                        </time>

                                    </div>

                                </div>



                                <div className="px-4 py-4 sm:px-5 sm:py-4">

                                    <div className="grid gap-2.5">

                                        {parsedContent.map((entry, index) => (

                                            <div key={`${item.id}-${index}`} className="border border-gray-200 bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-2.5">

                                                {entry.label ? (

                                                    <div className="grid gap-0.5 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">

                                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">

                                                            {entry.label}

                                                        </p>

                                                        <p className="text-sm text-gray-700 leading-6 break-words">

                                                            {entry.value}

                                                        </p>

                                                    </div>

                                                ) : (

                                                    <p className="text-sm text-gray-700 leading-6 break-words">

                                                        {entry.value}

                                                    </p>

                                                )}

                                            </div>

                                        ))}

                                    </div>

                                </div>

                            </article>

                        );

                    })}

                </div>

            )}

        </div>

    );

}
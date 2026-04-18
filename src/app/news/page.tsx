import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import NewsPageClient from '@/components/news/NewsPageClient';

type NewsUpdate = {
    id: string;
    title: string;
    content: string;
    created_at: string;
};

export const metadata: Metadata = {
    title: 'News & Updates | AuctionsGH',
    description: 'Stay updated with the latest news and announcements from AuctionsGH.',
};

const fallbackNews: NewsUpdate[] = [
    {
        id: '1',
        title: '[EQUIPMENT] Re-Auction — Chattels + 100KVA Perkins Plant',
        content: 'Owner: Monex Mining Company Ltd\nDate: Fri 17 Apr 2026, Happening now\nLocation: Mart warehouse\nAuctioneer: Kofi Dadzie, Allianz Mart | Tel: 0243030099 / 0265291463 / 0550679584\nAuthority: D/Sheriff District Court Madina\nNotes: Re-auction',
        created_at: new Date('2026-04-17T09:30:00.000Z').toISOString(),
    },
    {
        id: '2',
        title: '[PROPERTY] Re-Auction — Uncompleted 6-bed double-storey building — GD 185-5224',
        content: 'Owner: Robert Ashie Kotei\nDate: Fri 17 Apr 2026, 10:00am\nLocation: Nii Osae Ntiful Ave, East Legon, Accra\nAuctioneer: Mayfair Mart | Tel: 0244731387 / 0277598107\nAuthority: D/Sheriff High Court (Commercial Division), Accra\nNotes: Re-auction',
        created_at: new Date('2026-04-17T10:00:00.000Z').toISOString(),
    },
    {
        id: '3',
        title: '[PROPERTY] House GPS GA-580-1937 — Asatotu Close, Odorkor Tipper',
        content: 'Owner: Act King Kono\nDate: 15 May 2026, 10:30am\nLocation: Asatotu Close, Odorkor Tipper, Accra\nAuctioneer: Kwabena Obeng-Essumang, Pogas Mart | Tel: 2044931585\nAuthority: Circuit Court Weija',
        created_at: new Date('2026-04-17T08:45:00.000Z').toISOString(),
    },
    {
        id: '4',
        title: '[PROPERTY] Residential property HR2 — Teiko Akotia Street, Kaneshie',
        content: 'Owner: Beatrice Agyapomaa Amporful & Anor\nDate: 7 May 2026, 10:00am\nLocation: Teiko Akotia Street, Kaneshie, Accra\nAuctioneer: Akwasi Poku Acheampong, Asanteman Auctions | Tel: 0544163292 / 0265046551\nAuthority: D/Sheriff High Court, General Jurisdiction\nReserved Price: Yes',
        created_at: new Date('2026-04-17T08:30:00.000Z').toISOString(),
    },
    {
        id: '5',
        title: '[PROPERTY] Re-Auction — Residential property, Madina (Aglow)',
        content: 'Owner: Emmanuel Quarshie\nDate: 4 May 2026, 10:00am\nLocation: Madina\nAuctioneer: Kofi Dadzie, Allianz Mart | Tel: 0243030099 / 0265291463 / 0550679584\nAuthority: D/Sheriff District Court Madina\nNotes: Re-auction',
        created_at: new Date('2026-04-17T08:15:00.000Z').toISOString(),
    },
    {
        id: '6',
        title: '[VEHICLE] GMC Reg. GE 3358-14 + Kia Morning Reg. GE 9512-18 + 65" Hisense TV',
        content: 'Owner: Sunpower Innovation\nDate: 21 Apr 2026, 9:00am\nLocation: Not specified\nAuctioneer: Dabbey Mart | Tel: 0244238484 / 0208165278\nAuthority: D/Sheriff High Court (Commercial Division)\nNotes: Includes 65" Hisense TV',
        created_at: new Date('2026-04-17T08:00:00.000Z').toISOString(),
    },
    {
        id: '7',
        title: '[PROPERTY] Unnumbered residential house — Near Randy Boison Chemical Shop, Amanfro',
        content: 'Owner: Jerry Kweku Quartsin & Another\nDate: 15 May 2026, 10:00am\nLocation: Near Randy Boison Chemical Shop, Amanfro, Accra\nAuctioneer: Thomas Addy | Tel: 0244575939 / 0202449558\nAuthority: Deputy Sheriff High Court Commercial Division\nReserved Price: Yes',
        created_at: new Date('2026-04-17T07:45:00.000Z').toISOString(),
    },
    {
        id: '8',
        title: '[PROPERTY] Re-Auction — Residential property — No. 3 Salamander Street, Community 18, Lashibi',
        content: 'Owner: Anthony Boateng Sekyere\nDate: 14 May 2026, 10:00am\nLocation: No. 3 Salamander Street, Community 18, Lashibi, Tema\nAuctioneer: Thomas Addy | Tel: 0244575939 / 0202449558\nAuthority: Deputy Sheriff High Court Commercial Division\nReserved Price: Yes\nNotes: Re-auction',
        created_at: new Date('2026-04-17T07:30:00.000Z').toISOString(),
    },
];

export default async function NewsPage() {
    const supabase = await createClient();

    let news: NewsUpdate[] = [];

    let error: unknown = null;

    try {
        const result = await supabase
            .from('news_updates')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (result.error) {
            error = result.error;
        } else {
            news = result.data || [];
        }
    } catch (err) {
        error = err;
    }

    // Sample data for testing if table doesn't exist
    if (error && news.length === 0) {
        news = fallbackNews;
    }

    return <NewsPageClient initialNews={news} error={error} />;
}
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import NewsPageClient from '@/components/news/NewsPageClient';

export const metadata: Metadata = {
    title: 'News & Updates | AuctionsGH',
    description: 'Stay updated with the latest news and announcements from AuctionsGH.',
};

const fallbackNews = [
    {
        id: '1',
        title: '[VEHICLE] Motorbike — Supreme Start CG150',
        content: 'Owner: Paul Sakyi\nDate: Thu 16 Apr 2026, 9:00am\nLocation: Donkorkrom (D/Sheriff District Court)\nAuctioneer: Dabbey Mart | Tel: 0244238484 / 0208165278\nAuthority: D/Sheriff District Court\nNotes: Reg not specified',
        created_at: new Date('2026-04-16T09:00:00.000Z').toISOString(),
    },
    {
        id: '2',
        title: '[VEHICLE] Motorbike — Reg. M-20-EN46',
        content: 'Owner: Alex Zinyo\nDate: Thu 16 Apr 2026, 9:00am\nLocation: Donkorkrom (D/Sheriff District Court)\nAuctioneer: Dabbey Mart | Tel: 0244238484 / 0208165278\nAuthority: D/Sheriff District Court',
        created_at: new Date('2026-04-16T08:00:00.000Z').toISOString(),
    },
    {
        id: '3',
        title: '[VEHICLE] Unregistered Apsonic Tricycle',
        content: 'Owner: John Addai\nDate: Thu 16 Apr 2026, 9:00am\nLocation: Donkorkrom (D/Sheriff District Court)\nAuctioneer: Dabbey Mart | Tel: 0244238484 / 0208165278\nAuthority: D/Sheriff District Court\nNotes: Unregistered',
        created_at: new Date('2026-04-16T07:00:00.000Z').toISOString(),
    },
    {
        id: '4',
        title: '[VEHICLE] Dodge Ram — Reg. GE 7812-14',
        content: 'Owner: ED Oak Farms Per CEO, Dennis Ansah Acquah\nDate: Thu 16 Apr 2026, 9:00am\nLocation: Donkorkrom (D/Sheriff District Court)\nAuctioneer: Dabbey Mart | Tel: 0244238484 / 0208165278\nAuthority: D/Sheriff District Court',
        created_at: new Date('2026-04-16T06:00:00.000Z').toISOString(),
    },
    {
        id: '5',
        title: '[EQUIPMENT] Few unserviceable vehicles & chattels',
        content: 'Owner: Ministry of Fisheries and Aquaculture\nDate: Wed 23 Apr 2026, 9:00am\nLocation: Ministry of Fisheries and Aquaculture premises\nAuctioneer: Golden Mart | Tel: 0542135333\nAuthority: MOF (Ministry of Fisheries)\nNotes: Multiple vehicles and chattels',
        created_at: new Date('2026-04-16T05:00:00.000Z').toISOString(),
    },
    {
        id: '6',
        title: '[EQUIPMENT] 1 farm track + 4 unserviceable vehicles',
        content: 'Owner: Amenfi East Municipal Assembly\nDate: Thu 16 Apr 2026, 10:00am\nLocation: Amenfi East Municipal Assembly\nAuctioneer: Mount Zion Auction | Tel: 0244687447 / 0543985365\nAuthority: CoS',
        created_at: new Date('2026-04-16T04:00:00.000Z').toISOString(),
    },
    {
        id: '7',
        title: '[EQUIPMENT] Few unserviceable vehicles',
        content: 'Owner: Adanse North District Assembly\nDate: Thu 16 Apr 2026, 10:00am\nLocation: Adanse North District Assembly\nAuctioneer: Jactom Mart | Tel: 0249306455\nAuthority: MOF',
        created_at: new Date('2026-04-16T03:00:00.000Z').toISOString(),
    },
    {
        id: '8',
        title: '[VEHICLE] Sinotruk Howo 420HP Tractor Head — Reg. GT 6404-19',
        content: 'Owner: ABSAID LIMITED (Def/Judgment Debtor)\nDate: Fri 17 Apr 2026, 10:00am\nLocation: Tema off Aflao Road, before Traffic Light — Plaintiff Judgment Creditor premises\nAuctioneer: Giant Mart | Tel: 0243226094 / 0504349898 / 0302250084\nAuthority: D/Sheriff Commercial Court, Accra',
        created_at: new Date('2026-04-16T02:00:00.000Z').toISOString(),
    },
    {
        id: '9',
        title: '[PROPERTY] Three-storey commercial property — GPS G6-002-5845',
        content: 'Owner: ZEKIEL HOMES LTD & 5 ORS (Defendant/Judgment Debtor)\nDate: Thu 23 Apr 2026, 10:00am\nLocation: Nungua, Accra\nAuctioneer: Benjamin Kofi Sarfo of Big Crown Auctions | Tel: 0243938802 / 0547273774\nAuthority: Deputy Sheriff, High Court (Commercial Division), Accra\nReserved Price: Yes\nNotes: Reserved price applies',
        created_at: new Date('2026-04-16T01:00:00.000Z').toISOString(),
    },
    {
        id: '10',
        title: '[PROPERTY] Two-storey 4-bedroom house — Parcel No. 14866 Block 2, Section 157',
        content: 'Owner: Dr. Dennis Emmanuel Addo\nDate: Thu 16 Apr 2026, 10:00am\nLocation: No. 4A, Philip Quarcoo Drive, Linsay Enclave, Golf Hills-Achimota, Accra\nAuctioneer: Mr. Nii Aflah Sackey of NAS Auction | Tel: 0277126000\nAuthority: Lenders and Borrowers Act\nReserved Price: Yes\nNotes: Reserved price applies',
        created_at: new Date('2026-04-16T00:00:00.000Z').toISOString(),
    },
];

export default async function NewsPage() {
    const supabase = await createClient();

    let news = [];

    let error = null;

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
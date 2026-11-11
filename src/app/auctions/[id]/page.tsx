import type { Metadata } from 'next';
import AuctionDetail from '@/components/auction/AuctionDetail';
import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { AuctionFull } from '@/types/auction';
import { listingDescription, listingStructuredData, serializeJsonLd } from '@/lib/seo';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com').replace(/\/+$/, '');

interface AuctionPageProps {
    params: Promise<{ id: string }>;
}

// Public listing fields only. Never serialize orders, offers or winner notes
// into the server-rendered page. React cache shares this read with metadata.
const getListing = cache(async (id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.from('auctions').select(`
        id, seller_id, title, description, brand, model, storage_gb, ram_gb,
        battery_health, sim_type, network_lock, faults, condition,
        listing_city, meetup_area, delivery_available, allow_buy_now, inspection_available,
        starting_price, current_price, min_increment, bid_count, status, winner_id,
        starts_at, ends_at, created_at, updated_at, auction_images(url, position),
        profiles!auctions_seller_id_fkey(id, username, full_name, avatar_url, location, is_verified, whatsapp_enabled)
    `).eq('id', id).single();
    if (error && error.code !== 'PGRST116' && error.code !== '22P02') throw new Error('Could not load listing');
    const row = data as unknown as AuctionFull | null;
    // Phone column access is revoked for anon/authenticated; fetch it through
    // the gated function, and only serialize it into the public page when the
    // seller opted in to the WhatsApp button.
    if (row?.profiles) {
        if (row.profiles.whatsapp_enabled) {
            const { data: phone } = await (supabase as any).rpc('get_profile_phone', { profile_id: row.seller_id });
            row.profiles.phone_number = (phone as string | null) ?? null;
        } else {
            row.profiles.phone_number = null;
        }
    }
    return row;
});

export async function generateMetadata({ params }: AuctionPageProps): Promise<Metadata> {
    const { id } = await params;
    try {
        const auction = await getListing(id);
        if (!auction) return { title: 'Listing Not Found', robots: { index: false, follow: true } };
        const title = auction.title || `${auction.brand} ${auction.model}`;
        const description = listingDescription(auction);
        const pageUrl = `${SITE_URL}/auctions/${id}`;
        const photo = auction.auction_images
            ?.slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url;
        const hasPhoto = typeof photo === 'string' && /^https:\/\//.test(photo);
        const imageUrl = hasPhoto ? photo : `${pageUrl}/opengraph-image`;
        const imageDims = hasPhoto ? {} : { width: 1200, height: 630 };

        return {
            title,
            description,
            ...(!['active', 'sold'].includes(auction.status) ? { robots: { index: false, follow: true } } : {}),
            alternates: { canonical: pageUrl },
            openGraph: {
                title: `${title} | AuctionsGH`,
                description,
                url: pageUrl,
                type: 'website',
                siteName: 'AuctionsGH',
                images: [{ url: imageUrl, ...imageDims, alt: title }],
            },
            twitter: {
                card: 'summary_large_image',
                title: `${title} | AuctionsGH`,
                description,
                images: [imageUrl],
            },
        };
    } catch {
        return { title: 'Listing Details', robots: { index: false, follow: true } };
    }
}

export default async function AuctionPage({ params }: AuctionPageProps) {
    const { id } = await params;
    const auction = await getListing(id);
    if (!auction) notFound();

    return (
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-10">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listingStructuredData(auction, SITE_URL)) }} />
            <AuctionDetail auctionId={id} initialAuction={auction} />
        </div>
    );
}

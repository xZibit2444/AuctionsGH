'use client';

import Link from 'next/link';
import { formatCurrency, whatsappChatLink } from '@/lib/utils';
import { CONDITION_LABELS } from '@/lib/constants';
import { getListingType } from '@/lib/listings';
import { MapPin, MessageCircle, Package, Play } from 'lucide-react';
import type { Auction, SellerPreview } from '@/types/auction';

interface AuctionCardProps {
    auction: Auction & {
        auction_images?: { url: string; position: number }[];
        listing_videos?: { id: string }[] | null;
        profiles?: SellerPreview | null;
    };
}

/** Seller shown as first name plus last-name initial, username as fallback. */
function sellerDisplayName(profile: SellerPreview | null | undefined): string | null {
    if (!profile) return null;
    const full = profile.full_name?.trim();
    if (full) {
        const parts = full.split(/\s+/);
        return parts.length > 1
            ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
            : parts[0];
    }
    return profile.username || null;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
    const thumbnail = auction.auction_images?.sort(
        (a, b) => a.position - b.position
    )[0];
    const hasVideo = (auction.listing_videos ?? []).length > 0;
    const priceLabel = getListingType(auction) === 'permanent' ? 'Fixed price' : 'Auction';
    const conditionLabel = CONDITION_LABELS[auction.condition] ?? auction.condition;
    const sellerName = sellerDisplayName(auction.profiles);
    const sellerPhone = auction.profiles?.phone_number?.trim() || null;
    // Pinned cards act as the homepage enquiry channel: offer a direct WhatsApp
    // chat when the seller opted in, so visitors never need the detail page.
    const whatsappUrl = auction.is_pinned && auction.profiles?.whatsapp_enabled && sellerPhone
        ? whatsappChatLink(
            sellerPhone,
            `Hi, I'm interested in your listing "${auction.title}"${auction.price_on_request ? ' (price on request)' : ` (${formatCurrency(auction.current_price)})`} on AuctionsGH: https://auctionsgh.com/auctions/${auction.id} - is it still available?`
        )
        : null;

    return (
        <article className="group overflow-hidden rounded-[14px] border border-[#E9E6E0] bg-white transition-shadow duration-200 hover:shadow-md">
        <Link href={`/auctions/${auction.id}`} className="block">
                {/* Photo */}
                <div className="relative aspect-[4/3] bg-stone-100">
                    {thumbnail ? (
                        <img
                            src={thumbnail.url}
                            alt={auction.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-300">
                            <Package className="h-10 w-10" strokeWidth={1} />
                        </div>
                    )}
                    {auction.is_pinned && (
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-[#12100C]">
                            Pinned
                        </span>
                    )}
                    {conditionLabel && (
                        <span className={`absolute left-2.5 ${auction.is_pinned ? 'top-[38px]' : 'top-2.5'} rounded-md bg-[#12100C]/80 px-2 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm`}>
                            {conditionLabel}
                        </span>
                    )}
                    {hasVideo && (
                        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-bold text-[#12100C]">
                            <Play className="h-3 w-3" strokeWidth={2.5} />
                            Video
                        </span>
                    )}
                    {/* Sold listings stay browsable for 48h - mark them so a sold
                        card never reads as a live one in the grid */}
                    {auction.status === 'sold' && (
                        <span className="absolute inset-x-0 bottom-0 bg-[#12100C]/85 py-1.5 text-center text-[11px] font-black uppercase tracking-widest text-white">
                            Sold
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="px-3.5 pb-3.5 pt-3">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.3] tracking-tight text-[#191612]">
                        {auction.title}
                    </h3>
                    <p className="mt-[5px] flex items-center gap-1 text-[12.5px] leading-[1.2] text-[#6E675E]">
                        <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                        {auction.listing_city ?? 'Greater Accra'} · {auction.price_on_request ? 'Price on request' : priceLabel}
                    </p>
                    <p className="mt-[9px] text-[17px] font-extrabold leading-[1.2] tracking-tight text-black">
                        {auction.price_on_request ? 'On request' : formatCurrency(auction.current_price)}
                    </p>
                    {sellerName && (
                        <p className="mt-2.5 flex items-center gap-1.5 border-t border-[#F1EEE9] pt-2.5 text-[12px] font-medium leading-[1.2] text-[#6E675E]">
                            {auction.profiles?.avatar_url ? (
                                <img
                                    src={auction.profiles.avatar_url}
                                    alt=""
                                    loading="lazy"
                                    className="h-5 w-5 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#12100C] text-[10px] font-bold text-white">
                                    {sellerName[0].toUpperCase()}
                                </span>
                            )}
                            <span className="truncate">{sellerName}</span>
                        </p>
                    )}
                </div>
        </Link>
        {whatsappUrl && (
            <div className="px-3.5 pb-3.5">
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1FB857]"
                >
                    <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                    Message to enquire
                </a>
            </div>
        )}
    </article>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteSellersContext } from '@/contexts/FavoriteSellersContext';
import AuthGuard from '@/components/auth/AuthGuard';
import AuctionCard from '@/components/auction/AuctionCard';
import Avatar from '@/components/ui/Avatar';
import SellerRating from '@/components/ui/SellerRating';
import FavoriteSellerButton from '@/components/seller/FavoriteSellerButton';
import Link from 'next/link';
import { Heart, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import type { Auction } from '@/types/auction';
import { getUserDisplayLabel } from '@/lib/utils';

type SavedAuction = Auction & { auction_images?: { url: string; position: number }[] };
type FavoriteSeller = {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    location: string | null;
    is_verified: boolean;
};

export default function SavedPage() {
    const { user } = useAuth();
    const { favoriteSellerIds } = useFavoriteSellersContext();
    const [auctions, setAuctions] = useState<SavedAuction[]>([]);
    const [favoriteSellers, setFavoriteSellers] = useState<FavoriteSeller[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            queueMicrotask(() => {
                setAuctions([]);
                setFavoriteSellers([]);
                setLoading(false);
            });
            return;
        }

        const fetchSaved = async () => {
            setLoading(true);
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const auctionQuery = (supabase.from('saved_auctions') as any)
                .select(`
                    auction_id,
                    auctions (
                        *,
                        auction_images ( url, position )
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const sellerIds = [...favoriteSellerIds];
            const sellerQuery = sellerIds.length > 0
                ? supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url, location, is_verified')
                    .in('id', sellerIds)
                : Promise.resolve({ data: [] as FavoriteSeller[], error: null });

            const [{ data: auctionData }, { data: sellerData }] = await Promise.all([
                auctionQuery,
                sellerQuery,
            ]);

            const savedAuctions = (auctionData ?? [])
                .map((row: { auctions: SavedAuction | null }) => row.auctions)
                .filter(Boolean) as SavedAuction[];

            const sellersById = new Map((sellerData ?? []).map((seller) => [seller.id, seller]));
            const orderedSellers = sellerIds
                .map((sellerId) => sellersById.get(sellerId))
                .filter(Boolean) as FavoriteSeller[];

            setAuctions(savedAuctions);
            setFavoriteSellers(orderedSellers);
            setLoading(false);
        };

        fetchSaved();
    }, [user, favoriteSellerIds]);

    const hasAnySavedItems = favoriteSellers.length > 0 || auctions.length > 0;

    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                            Saved
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">Auctions and sellers you&apos;ve liked</p>
                    </div>
                    <Link
                        href="/auctions"
                        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
                    >
                        Browse more
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="bg-white h-36 border border-gray-200 skeleton-pulse" />
                            ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="bg-white aspect-[3/4] skeleton-pulse" />
                            ))}
                        </div>
                    </div>
                ) : !hasAnySavedItems ? (
                    <div className="text-center py-20 border border-gray-200">
                        <Heart className="h-8 w-8 text-gray-200 mx-auto mb-4" strokeWidth={1} />
                        <p className="text-sm font-semibold text-black mb-1">Nothing saved yet</p>
                        <p className="text-xs text-gray-400 mb-6">
                            Tap the heart on any listing or seller to save it here.
                        </p>
                        <Link
                            href="/auctions"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                        >
                            Browse Auctions
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-black">Favorite Sellers</h2>
                                    <p className="text-xs text-gray-400 mt-1">Sellers you want to keep an eye on</p>
                                </div>
                                <span className="text-xs font-semibold text-gray-400">{favoriteSellers.length} saved</span>
                            </div>

                            {favoriteSellers.length === 0 ? (
                                <div className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                                    No favorite sellers yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {favoriteSellers.map((seller) => {
                                        const sellerName = getUserDisplayLabel({
                                            fullName: seller.full_name,
                                            username: seller.username,
                                            fallbackId: seller.id,
                                        });

                                        return (
                                            <Link
                                                key={seller.id}
                                                href={`/sellers/${seller.id}`}
                                                className="group border border-gray-200 bg-white p-5 hover:border-black transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-4 min-w-0">
                                                        <Avatar
                                                            src={seller.avatar_url}
                                                            name={sellerName}
                                                            size="md"
                                                            className="ring-0 shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-base font-black leading-none text-black">
                                                                    {sellerName}
                                                                </p>
                                                                {seller.is_verified && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                                                                        <ShieldCheck className="h-3 w-3" />
                                                                        Verified
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2">
                                                                <SellerRating sellerId={seller.id} />
                                                            </div>
                                                            <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500">
                                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                                {seller.location || 'Location not shared'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <FavoriteSellerButton
                                                        sellerId={seller.id}
                                                        sellerName={sellerName}
                                                        compact
                                                        className="shrink-0"
                                                    />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-black">Saved Auctions</h2>
                                    <p className="text-xs text-gray-400 mt-1">Listings you&apos;ve bookmarked</p>
                                </div>
                                <span className="text-xs font-semibold text-gray-400">{auctions.length} saved</span>
                            </div>

                            {auctions.length === 0 ? (
                                <div className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                                    No saved auctions yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200">
                                    {auctions.map((auction) => (
                                        <div key={auction.id} className="bg-transparent">
                                            <AuctionCard auction={auction} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}

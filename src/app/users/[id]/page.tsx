import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock3, MapPin, Package, ShieldCheck, Star } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import FavoriteSellerButton from '@/components/seller/FavoriteSellerButton';
import SellerAdminMenu from '@/components/seller/SellerAdminMenu';
import ShareButton from '@/components/ui/ShareButton';
import ReviewsList from '@/components/profile/ReviewsList';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMissingShowPastBuysColumnError } from '@/lib/supabase/profileGuards';
import { formatCurrency, formatFirstNameLastInitial, timeAgo } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

interface UserPageProps {
    params: Promise<{ id: string }>;
}

type PublicProfile = {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    location: string | null;
    show_past_buys: boolean;
    is_verified: boolean;
    created_at: string;
};

type LegacyPublicProfile = Omit<PublicProfile, 'show_past_buys'>;

type PublicAuction = {
    id: string;
    title: string;
    brand: string;
    condition: string;
    current_price: number;
    status: string;
    created_at: string;
    ends_at: string;
    auction_images: { url: string; position: number }[] | null;
};

type PublicReview = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: {
        id: string;
        full_name: string | null;
        username: string | null;
    } | null;
};

type PublicPastBuy = {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    auction: {
        id: string;
        title: string;
        brand: string;
        condition: string;
        auction_images: { url: string; position: number }[] | null;
    } | null;
};

function hasWrittenReview(review: PublicReview) {
    return Boolean(review.comment?.trim());
}

async function getPublicProfileData(id: string) {
    const admin = createAdminClient();

    const profileQuery = admin
        .from('profiles')
        .select('id, username, full_name, avatar_url, location, show_past_buys, is_verified, created_at')
        .eq('id', id)
        .single();

    const [{ data: profileWithFlag, error: profileError }, { data: auctions }, { data: reviews }, { data: pastBuys }] = await Promise.all([
        profileQuery,
        admin
            .from('auctions')
            .select('id, title, brand, condition, current_price, status, created_at, ends_at, auction_images(url, position)')
            .eq('seller_id', id)
            .order('created_at', { ascending: false }),
        admin
            .from('user_reviews')
            .select('id, rating, comment, created_at, reviewer:profiles!reviewer_id(id, full_name, username)')
            .eq('reviewee_id', id)
            .order('created_at', { ascending: false }),
        admin
            .from('orders')
            .select('id, amount, status, created_at, auction:auctions(id, title, brand, condition, auction_images(url, position))')
            .eq('buyer_id', id)
            .in('status', ['completed', 'pin_verified'])
            .order('created_at', { ascending: false }),
    ]);

    let profile = profileWithFlag as PublicProfile | null;

    if (profileError && isMissingShowPastBuysColumnError(profileError)) {
        const { data: fallbackProfile } = await admin
            .from('profiles')
            .select('id, username, full_name, avatar_url, location, is_verified, created_at')
            .eq('id', id)
            .single() as { data: LegacyPublicProfile | null; error: unknown };

        profile = fallbackProfile
            ? {
                id: fallbackProfile.id,
                username: fallbackProfile.username,
                full_name: fallbackProfile.full_name,
                avatar_url: fallbackProfile.avatar_url,
                location: fallbackProfile.location,
                show_past_buys: false,
                is_verified: fallbackProfile.is_verified,
                created_at: fallbackProfile.created_at,
            }
            : null;
    }

    return {
        profile,
        auctions: (auctions ?? []) as PublicAuction[],
        reviews: (reviews ?? []) as PublicReview[],
        pastBuys: (pastBuys ?? []) as PublicPastBuy[],
    };
}

function listingPreview(auction: PublicAuction) {
    return [...(auction.auction_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
}

function statusTone(status: string) {
    if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'sold') return 'bg-black text-white border-black';
    if (status === 'ended') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-50 text-gray-500 border-gray-200';
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
    const { id } = await params;
    const { profile, auctions } = await getPublicProfileData(id);

    if (!profile) {
        return { title: 'Profile Not Found' };
    }

    const name = profile.full_name || profile.username;
    const role = auctions.length > 0 ? 'seller' : 'member';
    const title = `${name} Profile`;
    const description = `View ${name}'s public ${role} profile, reviews, and listings on AuctionsGH.`;
    const url = `${SITE_URL}/users/${profile.id}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title: `${title} | AuctionsGH`,
            description,
            url,
            siteName: 'AuctionsGH',
            type: 'website',
        },
    };
}

export default async function PublicUserProfilePage({ params }: UserPageProps) {
    const { id } = await params;
    const { profile, auctions, reviews: allReviews, pastBuys } = await getPublicProfileData(id);

    if (!profile) {
        notFound();
    }

    const reviews = allReviews.filter(hasWrittenReview);
    const activeListings = auctions.filter((auction) => auction.status === 'active');
    const listingHistory = auctions.filter((auction) => auction.status !== 'active');
    const ratingCount = reviews.length;
    const ratingAverage = ratingCount > 0
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount) * 10) / 10
        : null;
    const profileName = profile.full_name || profile.username;
    const profileLabel = formatFirstNameLastInitial(profile.full_name || profile.username);
    const isSeller = auctions.length > 0;
    const visiblePastBuys = !isSeller && profile.show_past_buys ? pastBuys : [];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="border border-gray-200 bg-white p-6 sm:p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <Avatar src={profile.avatar_url} name={profileName} size="lg" className="shrink-0 ring-0" />
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Public Profile</p>
                                {isSeller && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200">
                                        Seller
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                                <h1 className="text-3xl font-black tracking-tight text-black whitespace-nowrap">{profileLabel || 'User'}</h1>
                                {profile.is_verified && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <ShieldCheck className="h-3 w-3" />
                                        Verified
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                                {profile.location && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" />
                                        {profile.location}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4" />
                                    Joined {new Date(profile.created_at).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 min-w-full md:min-w-[28rem]">
                        <div className="flex justify-start md:justify-end">
                            <div className="flex flex-wrap items-center gap-3">
                                <ShareButton
                                    title={`${profileName} Profile`}
                                    url={`/users/${profile.id}`}
                                />
                                {isSeller && (
                                    <>
                                        <FavoriteSellerButton sellerId={profile.id} sellerName={profileLabel} />
                                        <SellerAdminMenu sellerId={profile.id} sellerName={profileName} />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatCard label="Current" value={String(activeListings.length)} />
                            <StatCard label="Listings" value={String(auctions.length)} />
                            <StatCard label="Reviews" value={String(ratingCount)} />
                            <StatCard label="Rating" value={ratingAverage?.toFixed(1) ?? '-'} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black tracking-tight text-black">Active Listings</h2>
                            <span className="text-xs font-semibold text-gray-400">{activeListings.length} active</span>
                        </div>

                        {activeListings.length === 0 ? (
                            <EmptyState message={isSeller ? 'No active listings right now.' : 'This member has no public listings.'} />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeListings.map((auction) => {
                                    const preview = listingPreview(auction);
                                    return (
                                        <Link key={auction.id} href={`/auctions/${auction.id}`} className="border border-gray-200 bg-white overflow-hidden hover:border-black transition-colors">
                                            <div className="aspect-[4/3] bg-gray-100">
                                                {preview ? (
                                                    <img src={preview} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <Package className="h-10 w-10" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center justify-between gap-3 mb-3">
                                                    <span className={`inline-flex px-2 py-1 border text-[10px] font-black uppercase tracking-widest ${statusTone(auction.status)}`}>
                                                        {auction.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{timeAgo(auction.created_at)}</span>
                                                </div>
                                                <h3 className="font-bold text-black line-clamp-2">{auction.title}</h3>
                                                <p className="text-xs text-gray-500 mt-2">{auction.brand} · {auction.condition.replace(/_/g, ' ')}</p>
                                                <p className="text-lg font-black text-black mt-3">{formatCurrency(auction.current_price)}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black tracking-tight text-black">Listing History</h2>
                            <span className="text-xs font-semibold text-gray-400">{listingHistory.length} past</span>
                        </div>

                        {listingHistory.length === 0 ? (
                            <EmptyState message="No completed or past listings yet." />
                        ) : (
                            <div className="border border-gray-200 bg-white divide-y divide-gray-100">
                                {listingHistory.map((auction) => (
                                    <Link key={auction.id} href={`/auctions/${auction.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-black truncate">{auction.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {auction.brand} · {auction.condition.replace(/_/g, ' ')} · Listed {new Date(auction.created_at).toLocaleDateString('en-GH')}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`inline-flex px-2 py-1 border text-[10px] font-black uppercase tracking-widest ${statusTone(auction.status)}`}>
                                                {auction.status}
                                            </span>
                                            <p className="text-sm font-black text-black mt-2">{formatCurrency(auction.current_price)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {!isSeller && profile.show_past_buys && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black tracking-tight text-black">Past Buys</h2>
                                <span className="text-xs font-semibold text-gray-400">{visiblePastBuys.length} completed</span>
                            </div>

                            {visiblePastBuys.length === 0 ? (
                                <EmptyState message="No public past buys yet." />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {visiblePastBuys.map((order) => {
                                        const preview = order.auction
                                            ? [...(order.auction.auction_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null
                                            : null;

                                        return (
                                            <Link key={order.id} href={`/orders/${order.id}`} className="border border-gray-200 bg-white overflow-hidden hover:border-black transition-colors">
                                                <div className="aspect-[4/3] bg-gray-100">
                                                    {preview ? (
                                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <Package className="h-10 w-10" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <span className="inline-flex px-2 py-1 border text-[10px] font-black uppercase tracking-widest bg-black text-white border-black">
                                                            Bought
                                                        </span>
                                                        <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                                                    </div>
                                                    <h3 className="font-bold text-black line-clamp-2">{order.auction?.title ?? 'Order'}</h3>
                                                    {order.auction && (
                                                        <p className="text-xs text-gray-500 mt-2">{order.auction.brand} · {order.auction.condition.replace(/_/g, ' ')}</p>
                                                    )}
                                                    <p className="text-lg font-black text-black mt-3">{formatCurrency(order.amount)}</p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <aside className="space-y-6">
                    <section className="border border-gray-200 bg-white p-5">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Profile Details</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-gray-500">Location</span>
                                <span className="font-semibold text-black text-right">{profile.location || 'Not shared'}</span>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-gray-500">Public role</span>
                                <span className="font-semibold text-black text-right">{isSeller ? 'Seller' : 'Buyer / Member'}</span>
                            </div>
                        </div>
                    </section>

                    <section className="border border-gray-200 bg-white p-5">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Review Summary</h2>
                        {ratingAverage === null ? (
                            <p className="text-sm text-gray-500">No reviews yet.</p>
                        ) : (
                            <div className="flex items-end gap-3">
                                <div className="text-4xl font-black text-black">{ratingAverage.toFixed(1)}</div>
                                <div className="pb-1">
                                    <div className="flex items-center gap-1 text-amber-500">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <Star key={index} className={`h-4 w-4 ${index < Math.round(ratingAverage) ? 'fill-current' : ''}`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{ratingCount} review{ratingCount === 1 ? '' : 's'}</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="border border-gray-200 bg-white p-5">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Reviews</h2>
                        <ReviewsList
                            reviews={reviews}
                            emptyMessage="Reviews will appear here after completed orders."
                        />
                    </section>
                </aside>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
            <p className="text-2xl font-black text-black">{value}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            {message}
        </div>
    );
}

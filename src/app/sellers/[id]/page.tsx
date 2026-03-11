import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock3, MapPin, Package, ShieldCheck, Star } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import FavoriteSellerButton from '@/components/seller/FavoriteSellerButton';
import SellerAdminMenu from '@/components/seller/SellerAdminMenu';
import ShareButton from '@/components/ui/ShareButton';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatFirstNameLastInitial, timeAgo } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

interface SellerPageProps {
    params: Promise<{ id: string }>;
}

type SellerProfile = {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    location: string | null;
    is_verified: boolean;
    created_at: string;
};

type SellerAuction = {
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

type SellerReview = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: {
        full_name: string | null;
        username: string | null;
    } | null;
};

async function getSellerPageData(id: string) {
    const admin = createAdminClient();

    const [{ data: seller }, { data: auctions }, { data: reviews }] = await Promise.all([
        admin
            .from('profiles')
            .select('id, username, full_name, avatar_url, location, is_verified, created_at')
            .eq('id', id)
            .single(),
        admin
            .from('auctions')
            .select('id, title, brand, condition, current_price, status, created_at, ends_at, auction_images(url, position)')
            .eq('seller_id', id)
            .order('created_at', { ascending: false }),
        admin
            .from('user_reviews')
            .select('id, rating, comment, created_at, reviewer:profiles!reviewer_id(full_name, username)')
            .eq('reviewee_id', id)
            .order('created_at', { ascending: false }),
    ]);

    return {
        seller: seller as SellerProfile | null,
        auctions: (auctions ?? []) as SellerAuction[],
        reviews: (reviews ?? []) as SellerReview[],
    };
}

function listingPreview(auction: SellerAuction) {
    return [...(auction.auction_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
}

function statusTone(status: string) {
    if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'sold') return 'bg-black text-white border-black';
    if (status === 'ended') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-50 text-gray-500 border-gray-200';
}

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
    const { id } = await params;
    const { seller } = await getSellerPageData(id);

    if (!seller) {
        return { title: 'Seller Not Found' };
    }

    const sellerName = seller.full_name || seller.username;
    const title = `${sellerName} Seller Profile`;
    const description = `View ${sellerName}'s seller profile, listings, and buyer reviews on AuctionsGH.`;
    const url = `${SITE_URL}/sellers/${seller.id}`;

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

export default async function SellerProfilePage({ params }: SellerPageProps) {
    const { id } = await params;
    const { seller, auctions, reviews } = await getSellerPageData(id);

    if (!seller) {
        notFound();
    }

    const currentListings = auctions.filter((auction) => auction.status === 'active');
    const listingHistory = auctions.filter((auction) => auction.status !== 'active');
    const ratingCount = reviews.length;
    const ratingAverage = ratingCount > 0
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount) * 10) / 10
        : null;
    const sellerName = seller.full_name || seller.username;
    const sellerLabel = formatFirstNameLastInitial(seller.full_name || seller.username);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="border border-gray-200 bg-white p-6 sm:p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <Avatar src={seller.avatar_url} name={sellerName} size="lg" className="shrink-0 ring-0" />
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Seller Profile</p>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                                <h1 className="text-3xl font-black tracking-tight text-black whitespace-nowrap">{sellerLabel || 'Seller'}</h1>
                                {seller.is_verified && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <ShieldCheck className="h-3 w-3" />
                                        Verified
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                                {seller.location && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" />
                                        {seller.location}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-4 w-4" />
                                    Selling since {new Date(seller.created_at).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 min-w-full md:min-w-[28rem]">
                        <div className="flex justify-start md:justify-end">
                            <div className="flex flex-wrap items-center gap-3">
                                <ShareButton
                                    title={`${sellerName} Seller Profile`}
                                    text={`View ${sellerName}'s seller profile on AuctionsGH.`}
                                    url={`/sellers/${seller.id}`}
                                />
                                <FavoriteSellerButton sellerId={seller.id} sellerName={sellerLabel} />
                                <SellerAdminMenu sellerId={seller.id} sellerName={sellerName} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatCard label="Current" value={String(currentListings.length)} />
                            <StatCard label="All Listings" value={String(auctions.length)} />
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
                            <h2 className="text-lg font-black tracking-tight text-black">Current Listings</h2>
                            <span className="text-xs font-semibold text-gray-400">{currentListings.length} active</span>
                        </div>

                        {currentListings.length === 0 ? (
                            <EmptyState message="This seller has no active listings right now." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentListings.map((auction) => {
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
                </div>

                <aside className="space-y-6">
                    <section className="border border-gray-200 bg-white p-5">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Seller Details</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-gray-500">Location</span>
                                <span className="font-semibold text-black text-right">{seller.location || 'Not shared'}</span>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-gray-500">Phone</span>
                                <span className="font-semibold text-black text-right">Private</span>
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
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Buyer Reviews</h2>
                        {reviews.length === 0 ? (
                            <p className="text-sm text-gray-500">Reviews will appear here after completed orders.</p>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map((review) => {
                                    const reviewerName = review.reviewer?.full_name || review.reviewer?.username || 'Buyer';
                                    return (
                                        <div key={review.id} className="border border-gray-100 bg-gray-50 p-4">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div>
                                                    <p className="text-sm font-bold text-black">{reviewerName}</p>
                                                    <p className="text-xs text-gray-400">{timeAgo(review.created_at)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 text-amber-500 shrink-0">
                                                    {Array.from({ length: 5 }).map((_, index) => (
                                                        <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-current' : ''}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed">{review.comment?.trim() || 'No written comment provided.'}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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

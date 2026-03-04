import Link from 'next/link';
import Image from 'next/image';
import CountdownTimer from './CountdownTimer';

export interface AuctionCardProps {
    id: string;
    title: string;
    brand: string;
    model: string;
    condition: string;
    currentPrice: number;
    imageUrl?: string;
    endsAt: string;
    bidCount: number;
    status: 'active' | 'ended' | 'sold' | 'draft' | 'cancelled';
}

const conditionColors: Record<string, string> = {
    new: 'bg-emerald-100 text-emerald-700',
    like_new: 'bg-teal-100 text-teal-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-yellow-100 text-yellow-700',
    poor: 'bg-red-100 text-red-700',
};

const conditionLabel: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
};

export default function AuctionCard({
    id,
    title,
    brand,
    model,
    condition,
    currentPrice,
    imageUrl,
    endsAt,
    bidCount,
    status,
}: AuctionCardProps) {
    const isActive = status === 'active';

    return (
        <Link
            href={`/auctions/${id}`}
            className="group block bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200"
        >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                        📱
                    </div>
                )}

                {/* Status overlay */}
                {!isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg uppercase tracking-wide">
                            {status === 'sold' ? '🏆 Sold' : 'Ended'}
                        </span>
                    </div>
                )}

                {/* Condition badge */}
                <span
                    className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-lg ${conditionColors[condition] ?? 'bg-gray-100 text-gray-700'
                        }`}
                >
                    {conditionLabel[condition] ?? condition}
                </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {brand}
                </p>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
                    {title}
                </h3>

                {/* Price row */}
                <div className="flex items-end justify-between gap-2">
                    <div>
                        <p className="text-xs text-gray-400">Current bid</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ₵{currentPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {bidCount} bid{bidCount !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Countdown */}
                {isActive && (
                    <CountdownTimer endsAt={endsAt} compact />
                )}
            </div>
        </Link>
    );
}

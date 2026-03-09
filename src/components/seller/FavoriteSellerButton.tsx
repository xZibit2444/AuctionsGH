'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useFavoriteSellersContext } from '@/contexts/FavoriteSellersContext';

interface FavoriteSellerButtonProps {
    sellerId: string;
    sellerName?: string;
    className?: string;
    compact?: boolean;
}

export default function FavoriteSellerButton({
    sellerId,
    sellerName = 'seller',
    className,
    compact = false,
}: FavoriteSellerButtonProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { favoriteSellerIds, toggleFavoriteSeller } = useFavoriteSellersContext();
    const [pending, setPending] = useState(false);
    const isFavorited = favoriteSellerIds.has(sellerId);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            router.push('/login');
            return;
        }

        if (pending) return;
        setPending(true);
        await toggleFavoriteSeller(sellerId);
        setPending(false);
    };

    return (
        <button
            onClick={handleClick}
            disabled={pending}
            aria-label={isFavorited ? `Remove ${sellerName} from favorites` : `Favorite ${sellerName}`}
            className={cn(
                'inline-flex items-center justify-center gap-2 border transition-colors disabled:opacity-50',
                compact
                    ? 'h-9 w-9 border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black'
                    : isFavorited
                        ? 'px-4 py-2 bg-black text-white border-black hover:bg-gray-900'
                        : 'px-4 py-2 bg-white text-black border-gray-200 hover:border-black',
                className
            )}
        >
            <Heart className="h-4 w-4" fill={isFavorited ? 'currentColor' : 'none'} strokeWidth={2} />
            {!compact && (
                <span className="text-xs font-black uppercase tracking-widest">
                    {isFavorited ? 'Favorited' : 'Favorite Seller'}
                </span>
            )}
        </button>
    );
}

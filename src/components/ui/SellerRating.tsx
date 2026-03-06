'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Star } from 'lucide-react';

interface SellerRatingProps {
    sellerId: string;
}

export default function SellerRating({ sellerId }: SellerRatingProps) {
    const [avg, setAvg] = useState<number | null>(null);
    const [count, setCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();
        (supabase as any)
            .from('user_reviews')
            .select('rating')
            .eq('reviewee_id', sellerId)
            .then(({ data }: { data: { rating: number }[] | null }) => {
                if (data && data.length > 0) {
                    const sum = data.reduce((a: number, r: { rating: number }) => a + r.rating, 0);
                    setAvg(Math.round((sum / data.length) * 10) / 10);
                    setCount(data.length);
                }
            });
    }, [sellerId]);

    if (avg === null) return null;

    return (
        <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-800">{avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({count})</span>
        </div>
    );
}

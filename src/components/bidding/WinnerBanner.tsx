import { formatCurrency } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface WinnerBannerProps {
    auctionTitle: string;
    amount: number;
}

export default function WinnerBanner({ auctionTitle, amount }: WinnerBannerProps) {
    return (
        <div className="mb-6 p-6 bg-black text-white">
            <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold">Congratulations, you won!</h2>
            </div>
            <p className="text-gray-300">
                You won <strong>&quot;{auctionTitle}&quot;</strong> for{' '}
                <strong>{formatCurrency(amount)}</strong>. The seller will contact you
                to arrange the handover.
            </p>
        </div>
    );
}

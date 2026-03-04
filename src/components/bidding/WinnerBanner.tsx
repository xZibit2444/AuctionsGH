import { formatCurrency } from '@/lib/utils';

interface WinnerBannerProps {
    auctionTitle: string;
    amount: number;
}

export default function WinnerBanner({ auctionTitle, amount }: WinnerBannerProps) {
    return (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🏆</span>
                <h2 className="text-xl font-bold">Congratulations, you won!</h2>
            </div>
            <p className="text-emerald-100">
                You won <strong>&quot;{auctionTitle}&quot;</strong> for{' '}
                <strong>{formatCurrency(amount)}</strong>. The seller will contact you
                to arrange the handover.
            </p>
        </div>
    );
}

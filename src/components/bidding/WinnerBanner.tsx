import { formatCurrency } from '@/lib/utils';
import { Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface WinnerBannerProps {
    auctionId: string;
    auctionTitle: string;
    amount: number;
    orderId?: string;
}

export default function WinnerBanner({ auctionId, auctionTitle, amount, orderId }: WinnerBannerProps) {
    return (
        <div className="mb-6 p-6 bg-black text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold">
                        {orderId ? "Auction Secured!" : "Congratulations, you won!"}
                    </h2>
                </div>
                <p className="text-gray-300">
                    {orderId ? (
                        <>You've successfully secured <strong>&quot;{auctionTitle}&quot;</strong>. Track your delivery or pickup status.</>
                    ) : (
                        <>You won <strong>&quot;{auctionTitle}&quot;</strong> for{' '}
                            <strong>{formatCurrency(amount)}</strong>. You have 30 minutes to confirm your order.</>
                    )}
                </p>
            </div>

            <Link
                href={orderId ? `/orders/${orderId}` : `/checkout/${auctionId}`}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors"
            >
                {orderId ? 'Track Your Order' : 'Confirm Order'}
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

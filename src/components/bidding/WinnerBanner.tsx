import { formatCurrency } from '@/lib/utils';
import { Trophy, ArrowRight } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import Link from 'next/link';

interface WinnerBannerProps {
    auctionId: string;
    auctionTitle: string;
    amount: number;
    orderId?: string;
    sellerId?: string;
    whatsappUrl?: string | null;
}

export default function WinnerBanner({ auctionId, auctionTitle, amount, orderId, sellerId, whatsappUrl }: WinnerBannerProps) {
    const contactHref = whatsappUrl ?? (sellerId ? `/users/${sellerId}` : `/auctions/${auctionId}`);
    const contactExternal = Boolean(whatsappUrl);
    return (
        <div className="mb-6 rounded-2xl p-6 bg-black text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold">
                        {orderId ? "Auction Secured!" : "Congratulations, you won!"}
                    </h2>
                </div>
                <p className="text-gray-300">
                    {orderId ? (
                        <>You&apos;ve successfully secured <strong>&quot;{auctionTitle}&quot;</strong>. Track your delivery or pickup status.</>
                    ) : (
                        <>You won <strong>&quot;{auctionTitle}&quot;</strong> for{' '}
                            <strong>{formatCurrency(amount)}</strong>. Contact the seller to arrange payment and pickup.</>
                    )}
                </p>
            </div>

            {orderId ? (
                <Link
                    href={`/orders/${orderId}`}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors"
                >
                    Track Your Order
                    <ArrowRight className="w-4 h-4" />
                </Link>
            ) : contactExternal ? (
                <a
                    href={contactHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white text-sm font-bold hover:bg-[#1fb857] transition-colors"
                >
                    <WhatsAppIcon className="w-4 h-4" />
                    WhatsApp Seller
                </a>
            ) : (
                <Link
                    href={contactHref}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors"
                >
                    Contact Seller
                    <ArrowRight className="w-4 h-4" />
                </Link>
            )}
        </div>
    );
}

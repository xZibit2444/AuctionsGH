'use client';

import { use } from 'react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface CheckoutPageProps {
    params: Promise<{ id: string }>;
}

/**
 * Checkout no longer exists: buyers and sellers arrange payment and handover
 * directly (offers, in-house deal chat or WhatsApp). Anyone landing on an old
 * checkout link is sent back to the listing.
 */
export default function CheckoutPage({ params }: CheckoutPageProps) {
    const { id } = use(params);

    return (
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2 text-black">Deals now happen directly with the seller</h1>
            <p className="text-gray-500 mb-6 font-medium">
                AuctionsGH no longer runs checkout or delivery codes. Make an offer or chat with the seller from the listing to arrange payment and pickup, and inspect the item before you pay.
            </p>
            <Link href={`/auctions/${id}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors">
                Back to Listing
            </Link>
        </div>
    );
}

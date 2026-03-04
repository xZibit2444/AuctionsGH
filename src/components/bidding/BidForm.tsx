'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface BidFormProps {
    auctionId: string;
    currentPrice: number;
    minIncrement: number;
}

export default function BidForm({
    auctionId,
    currentPrice,
    minIncrement,
}: BidFormProps) {
    const { user } = useAuth();
    const minBid = currentPrice + minIncrement;
    const [amount, setAmount] = useState<string>(minBid.toFixed(2));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!user) {
            setError('Please log in to place a bid');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < minBid) {
            setError(`Minimum bid is ${formatCurrency(minBid)}`);
            return;
        }

        setLoading(true);

        // Call the server-side API route which validates session and calls
        // the atomic place_bid DB function (row-locked to handle concurrency).
        const res = await fetch('/api/bids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auction_id: auctionId, amount: numAmount }),
        });

        const json = await res.json();

        if (!res.ok || json.error) {
            setError(json.error ?? 'Failed to place bid');
            setLoading(false);
            return;
        }

        setSuccess(true);
        // Suggest next minimum bid
        setAmount((numAmount + minIncrement).toFixed(2));
        setLoading(false);

        setTimeout(() => setSuccess(false), 3000);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">
                <div className="flex-1">
                    <Input
                        id="bid-amount"
                        type="number"
                        prefix="₵"
                        placeholder={minBid.toFixed(2)}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={minBid}
                        step="0.01"
                    />
                </div>
                <Button type="submit" isLoading={loading} size="lg">
                    Place Bid
                </Button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
                Minimum bid: {formatCurrency(minBid)}
            </p>

            {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm">
                    ✓ Bid placed successfully!
                </div>
            )}
        </form>
    );
}

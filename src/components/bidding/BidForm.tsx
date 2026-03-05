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

        try {
            const res = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auction_id: auctionId, amount: numAmount }),
            });

            const json = await res.json();

            if (!res.ok || json.error) {
                setError(json.error ?? 'Failed to place bid');
                return;
            }

            setSuccess(true);
            setAmount((numAmount + minIncrement).toFixed(2));
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }

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
                <div className="p-3 border border-red-200 bg-white text-red-600 font-medium text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 border border-black bg-black text-white font-medium text-sm">
                    ✓ Bid placed successfully!
                </div>
            )}
        </form>
    );
}

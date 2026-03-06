'use client';

import { useRef, useState } from 'react';
import { confirmDeliveryAction, markShippedAction } from '@/app/actions/delivery';
import { Truck, CheckCircle2, PackageCheck, Loader2 } from 'lucide-react';
import type { DeliveryStatus } from '@/types/delivery';

interface DeliveryConfirmationFormProps {
    orderId: string;
    deliveryStatus: DeliveryStatus;
    onStatusChange: (status: DeliveryStatus) => void;
}

export default function DeliveryConfirmationForm({
    orderId,
    deliveryStatus,
    onStatusChange,
}: DeliveryConfirmationFormProps) {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const pinPanelRef = useRef<HTMLDivElement>(null);

    const isSent = deliveryStatus === 'sent' || deliveryStatus === 'delivered' || deliveryStatus === 'completed';

    const handleMarkSent = async () => {
        setLoading(true);
        setError('');
        const result = await markShippedAction(orderId);
        if (result.success) {
            setSuccess('Order marked as sent.');
            onStatusChange('sent');
        } else {
            setError(result.error ?? 'Failed to update status');
        }
        setLoading(false);
    };

    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) return;

        setLoading(true);
        setError('');

        const result = await confirmDeliveryAction(orderId, pin.trim());
        if (result.success) {
            setSuccess('PIN verified. Delivery completed!');
            onStatusChange('completed');
            setPin('');
        } else {
            const isWrongPin = (result.error ?? '').toLowerCase().includes('incorrect');
            setError(isWrongPin ? 'Wrong PIN. Ask the buyer to repeat their code.' : (result.error ?? 'Failed to verify PIN'));

            if (isWrongPin) {
                pinPanelRef.current?.animate(
                    [
                        { transform: 'translateX(0)' },
                        { transform: 'translateX(-8px)' },
                        { transform: 'translateX(8px)' },
                        { transform: 'translateX(-6px)' },
                        { transform: 'translateX(6px)' },
                        { transform: 'translateX(0)' },
                    ],
                    { duration: 360, easing: 'ease-in-out' }
                );
            }
        }

        setLoading(false);
    };

    if (deliveryStatus === 'delivered' || deliveryStatus === 'completed') {
        return (
            <div className="bg-emerald-50 border border-emerald-200 p-8 text-center">
                <PackageCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-black text-emerald-700 uppercase tracking-widest mb-1">Delivery Confirmed</p>
                <p className="text-xs text-emerald-600">The delivery code was verified successfully. This order is complete.</p>
            </div>
        );
    }

    return (
        <div className="bg-black text-white p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
                <h2 className="text-base font-black tracking-tight uppercase">Seller Delivery Actions</h2>
            </div>

            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {success}
                </div>
            )}

            {/* ── Step 1: Mark as Sent ── */}
            <div className={`border p-5 ${isSent ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/20 bg-white/5'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${isSent ? 'bg-emerald-500 text-white' : 'bg-white text-black'}`}>
                        {isSent ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                    </span>
                    <p className="text-sm font-black uppercase tracking-widest">
                        {isSent ? 'Item Sent ✓' : 'Step 1 — Mark as Sent'}
                    </p>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    {isSent
                        ? 'You have marked this item as sent. Now wait for the buyer to give you their PIN.'
                        : 'Once you have handed the phone to the buyer or a courier, tap the button below.'}
                </p>
                <button
                    onClick={handleMarkSent}
                    disabled={isSent || loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold uppercase tracking-widest transition-colors"
                >
                    {loading && !isSent ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                    ) : isSent ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Marked as Sent</>
                    ) : (
                        <><Truck className="w-4 h-4" /> Mark as Sent</>
                    )}
                </button>
            </div>

            {/* ── Step 2: Verify Buyer PIN ── */}
            <div ref={pinPanelRef} className={`border p-5 ${deliveryStatus === 'sent' ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${deliveryStatus === 'sent' ? 'bg-amber-400 text-black' : 'bg-white/20 text-gray-400'}`}>
                        2
                    </span>
                    <p className={`text-sm font-black uppercase tracking-widest ${deliveryStatus === 'sent' ? 'text-amber-300' : 'text-gray-400'}`}>
                        Step 2 — Enter Buyer PIN
                    </p>
                </div>

                {deliveryStatus === 'sent' ? (
                    <div className="mb-4 p-3 bg-amber-500/20 border border-amber-400/40 text-amber-100">
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1">Action Required</p>
                        <p className="text-sm font-semibold">Ask the buyer for their 6-digit code and enter it below to complete the delivery.</p>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm mb-4">This PIN input unlocks after you mark the item as sent in Step 1.</p>
                )}

                <form onSubmit={handleVerifyPin} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Buyer&apos;s Delivery PIN
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{4,6}"
                            maxLength={6}
                            required
                            disabled={deliveryStatus !== 'sent'}
                            placeholder="— — — — — —"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/5 border border-white/20 p-4 text-3xl tracking-[0.4em] text-center text-white focus:outline-none focus:border-amber-400 font-mono disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={deliveryStatus !== 'sent' || loading || pin.length < 4}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold uppercase tracking-widest transition-colors"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" /> Confirm Delivery</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { confirmDeliveredByBuyerAction, getDeliveryCodeAction } from '@/app/actions/delivery';
import { Eye, EyeOff, Truck, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

interface DeliveryCodeDisplayProps {
    orderId: string;
    deliveryStatus: string;
    onStatusChange: (status: 'completed') => void;
}

export default function DeliveryCodeDisplay({ orderId, deliveryStatus, onStatusChange }: DeliveryCodeDisplayProps) {
    const [code, setCode] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        getDeliveryCodeAction(orderId).then(({ code, error }) => {
            if (code) setCode(code);
            else setError(error ?? 'Could not load delivery code');
            setLoading(false);
        });
    }, [orderId]);

    const isDelivered = deliveryStatus === 'delivered' || deliveryStatus === 'completed';

    const handleConfirmDelivered = async () => {
        setConfirming(true);
        setError('');
        const result = await confirmDeliveredByBuyerAction(orderId);
        if (result.success) {
            setConfirmed(true);
            onStatusChange('completed');
        } else {
            setError(result.error ?? 'Failed to confirm delivery');
        }
        setConfirming(false);
    };

    if (isDelivered) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 p-6 text-center">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Delivery Confirmed</p>
                <p className="text-xs text-emerald-600 mt-1">The courier has successfully delivered your item.</p>
            </div>
        );
    }

    return (
        <div className="bg-black text-white p-6">
            <div className="flex items-center gap-3 mb-5">
                <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
                <h2 className="text-base font-black tracking-tight uppercase">Your Delivery Code</h2>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-6">
                When your phone arrives and you confirm it is correct, call the seller and read this code to them.
                The seller enters it to confirm delivery and complete your order.
            </p>

            <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/40 text-blue-100">
                <p className="text-[11px] font-black uppercase tracking-widest mb-1">Buyer Action</p>
                <p className="text-sm font-semibold">Received the phone? Call the seller and give them this code.</p>
            </div>

            {deliveryStatus === 'sent' && (
                <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-100">
                    <p className="text-[11px] font-black uppercase tracking-widest mb-2">Final Step</p>
                    <p className="text-sm font-semibold mb-3">After receiving the phone, tap below to mark delivery as complete.</p>
                    <button
                        onClick={handleConfirmDelivered}
                        disabled={confirming || confirmed}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        {confirming ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                        ) : confirmed ? (
                            <><CheckCircle2 className="w-4 h-4" /> Confirmed</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" /> I Have Received It</>
                        )}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="h-16 bg-white/10 skeleton-pulse mb-6" />
            ) : error ? (
                <div className="p-4 bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold mb-6">
                    {error}
                </div>
            ) : (
                <div className="mb-6">
                    <div className="relative bg-white/10 border border-white/20 p-5 flex items-center justify-center">
                        <span className={`font-mono font-black text-4xl tracking-[0.3em] text-white transition-all duration-200 ${!visible ? 'blur-sm select-none' : ''}`}>
                            {code}
                        </span>
                        <button
                            onClick={() => setVisible(v => !v)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            aria-label={visible ? 'Hide code' : 'Show code'}
                        >
                            {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-gray-500 mt-2 uppercase tracking-widest">
                        {visible ? 'Tap the eye icon to hide' : 'Tap the eye icon to reveal'}
                    </p>
                </div>
            )}

            <div className="bg-white/5 border border-white/10 p-4 text-xs text-gray-300 leading-relaxed">
                <p className="font-bold text-white mb-1">Important</p>
                Only share this code when you have physically received and inspected the phone. Do not share it in advance.
            </div>
        </div>
    );
}

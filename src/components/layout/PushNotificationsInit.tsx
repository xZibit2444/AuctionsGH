'use client';

import { Bell, Smartphone, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationsInit() {
    const { user } = useAuth();
    const {
        isSupported,
        canPrompt,
        busy,
        requestNotifications,
        dismissPrompt,
    } = usePushNotifications(user?.id);

    if (!user || !isSupported || !canPrompt) return null;

    return (
        <div className="fixed inset-x-4 bottom-24 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[26rem]">
            <div className="border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-start gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-black text-white">
                        <Bell className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Notifications
                                </p>
                                <h2 className="mt-1 text-lg font-black text-black">
                                    Do you want to receive notis?
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={dismissPrompt}
                                className="shrink-0 text-gray-300 transition-colors hover:text-black"
                                aria-label="Dismiss notification prompt"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Get instant alerts on bids, wins, offers, messages, and order updates on this device.
                        </p>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => { void requestNotifications(); }}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Smartphone className="h-4 w-4" />
                                {busy ? 'Setting up...' : 'Allow notifications'}
                            </button>
                            <button
                                type="button"
                                onClick={dismissPrompt}
                                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-black"
                            >
                                Not now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

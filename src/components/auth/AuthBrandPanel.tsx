'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Props {
    variant: 'login' | 'signup';
}

export default function AuthBrandPanel({ variant }: Props) {
    return (
        <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-white via-white to-amber-50/40 border-r border-gray-100 flex-col justify-between px-12 py-10 xl:px-16 xl:py-12">

            {/* Logo */}
            <Link href="/">
                <Image src="/logo.png" alt="AuctionsGH" width={180} height={50} className="h-10 w-auto object-contain xl:h-11" priority />
            </Link>

            {/* Center message */}
            <div className="max-w-md space-y-8 xl:space-y-10">
                <div className="space-y-4">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-[0.28em]">
                        {variant === 'login' ? "Ghana's Premier" : 'Join the community'}
                    </p>
                    <h2 className="text-[3.1rem] font-black text-slate-900 leading-[0.92] tracking-[-0.04em] xl:text-[3.5rem]">
                        {variant === 'login'
                            ? <><span>Online</span><br /><span>Auction</span><br /><span>Platform</span></>
                            : <><span>Buy &amp; Sell</span><br /><span>Anything</span><br /><span>Securely</span></>
                        }
                    </h2>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                    <div className="h-1 w-14 rounded-full bg-amber-400" />
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-200/80 to-transparent" />
                </div>

                <p className="max-w-sm text-base leading-8 text-slate-500">
                    {variant === 'login'
                        ? 'Bid on verified items. Sell yours to the highest bidder. Every transaction is secure.'
                        : 'Create your free account and start bidding within minutes. Verified listings. Protected transactions.'
                    }
                </p>

                {variant === 'signup' && (
                    <div className="space-y-3 rounded-2xl border border-amber-100 bg-white/80 p-5 shadow-sm shadow-amber-100/30 backdrop-blur">
                        {['Free to join - no subscription', 'Bid on any active listing instantly', 'Sell your items at the best price', 'Secure payments via verified channels'].map((point) => (
                            <div key={point} className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-amber-400 rounded-full shrink-0" />
                                <p className="text-sm leading-6 text-slate-600">{point}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-300">&copy; 2025 AuctionsGH &middot; All rights reserved</p>
        </div>
    );
}
